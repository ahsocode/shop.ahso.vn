// app/api/search/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

// Helper: Normalize search query
function normalizeQuery(query: string): string {
  return query
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove diacritics
    .trim();
}

// Helper: Split query into words
function splitWords(query: string): string[] {
  return normalizeQuery(query)
    .split(/\s+/)
    .filter((w) => w.length > 0);
}

// Helper: Build search conditions (MySQL compatible - no mode)
function buildSearchConditions(query: string) {
  // Exact match conditions (case-insensitive by default in MySQL)
  const exactConditions: Prisma.ProductWhereInput[] = [
    { name: { contains: query } },
    { sku: { contains: query } },
    { description: { contains: query } },
  ];

  // Word-by-word match conditions
  const words = splitWords(query);
  const wordConditions: Prisma.ProductWhereInput[] = words.flatMap((word) => [
    { name: { contains: word } },
    { description: { contains: word } },
  ]);

  // Brand name search
  const brandConditions: Prisma.ProductWhereInput[] = [
    { brand: { is: { name: { contains: query } } } },
    { brand: { is: { slug: { contains: query } } } },
  ];

  // Category search
  const categoryConditions: Prisma.ProductWhereInput[] = [
    { type: { is: { name: { contains: query } } } },
    {
      type: {
        is: {
          category: {
            is: { name: { contains: query } },
          },
        },
      },
    },
  ];

  return {
    OR: [
      ...exactConditions,
      ...wordConditions,
      ...brandConditions,
      ...categoryConditions,
    ],
  };
}

// Helper: Calculate relevance score
function calculateRelevance(product: any, query: string): number {
  const normalized = normalizeQuery(query);
  const words = splitWords(query);
  let score = 0;

  // Exact name match: +100
  if (normalizeQuery(product.name).includes(normalized)) {
    score += 100;
  }

  // Name starts with query: +50
  if (normalizeQuery(product.name).startsWith(normalized)) {
    score += 50;
  }

  // SKU match: +80
  if (normalizeQuery(product.sku).includes(normalized)) {
    score += 80;
  }

  // Brand match: +40
  if (product.brand?.name && normalizeQuery(product.brand.name).includes(normalized)) {
    score += 40;
  }

  // Word matches in name: +10 per word
  const nameLower = normalizeQuery(product.name);
  words.forEach((word) => {
    if (nameLower.includes(word)) {
      score += 10;
    }
  });

  // Description match: +5
  if (product.description && normalizeQuery(product.description).includes(normalized)) {
    score += 5;
  }

  // Boost by rating
  score += (product.ratingAvg ?? 0) * 2;

  // Boost by purchase count
  score += Math.min((product.purchaseCount ?? 0) * 0.1, 20);

  return score;
}

/**
 * GET /api/search?q=keyword&limit=10&type=products|brands|categories|all
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q")?.trim() || "";
    const limit = Math.min(parseInt(searchParams.get("limit") || "10"), 50);
    const type = searchParams.get("type") || "all"; // products | brands | categories | all
    const includeOutOfStock = searchParams.get("includeOutOfStock") === "true";

    if (!query || query.length < 2) {
      return NextResponse.json({
        success: true,
        data: {
          products: [],
          brands: [],
          categories: [],
          query: query,
        },
        meta: {
          totalProducts: 0,
          totalBrands: 0,
          totalCategories: 0,
          searchTime: 0,
        },
      });
    }

    const startTime = Date.now();

    // Build search results
    const results: any = {
      products: [],
      brands: [],
      categories: [],
    };

    // Search Products
    if (type === "products" || type === "all") {
      const searchConditions = buildSearchConditions(query);
      
      const stockCondition = includeOutOfStock
        ? {}
        : { stockOnHand: { gt: 0 } };

      const products = await prisma.product.findMany({
        where: {
          AND: [
            searchConditions,
            stockCondition,
            { status: "PUBLISHED" },
          ],
        },
        take: limit * 2, // Get more for relevance sorting
        select: {
          id: true,
          slug: true,
          name: true,
          sku: true,
          description: true,
          coverImage: true,
          price: true,
          currency: true,
          stockOnHand: true,
          ratingAvg: true,
          ratingCount: true,
          purchaseCount: true,
          brand: {
            select: {
              name: true,
              slug: true,
              logoUrl: true,
            },
          },
          type: {
            select: {
              name: true,
              slug: true,
              category: {
                select: {
                  name: true,
                  slug: true,
                },
              },
            },
          },
        },
      });

      // Calculate relevance and sort
      const scoredProducts = products
        .map((p) => ({
          ...p,
          relevance: calculateRelevance(p, query),
        }))
        .sort((a, b) => b.relevance - a.relevance)
        .slice(0, limit);

      results.products = scoredProducts.map((p) => ({
        id: p.id,
        slug: p.slug,
        name: p.name,
        sku: p.sku,
        description: p.description,
        image: p.coverImage,
        price: Number(p.price ?? 0),
        currency: p.currency,
        inStock: (p.stockOnHand ?? 0) > 0,
        rating: {
          avg: p.ratingAvg ?? 0,
          count: p.ratingCount ?? 0,
        },
        purchaseCount: p.purchaseCount ?? 0,
        brand: p.brand
          ? {
              name: p.brand.name,
              slug: p.brand.slug,
              logo: p.brand.logoUrl,
            }
          : null,
        category: p.type?.category
          ? {
              name: p.type.category.name,
              slug: p.type.category.slug,
            }
          : null,
        relevance: p.relevance,
      }));
    }

    // Search Brands
    if (type === "brands" || type === "all") {
      const brands = await prisma.brand.findMany({
        where: {
          OR: [
            { name: { contains: query } },
            { slug: { contains: query } },
            { summary: { contains: query } },
          ],
        },
        take: Math.min(limit, 10),
        select: {
          id: true,
          slug: true,
          name: true,
          logoUrl: true,
          summary: true,
          productCount: true,
        },
        orderBy: [
          { productCount: "desc" },
          { name: "asc" },
        ],
      });

      results.brands = brands.map((b) => ({
        id: b.id,
        slug: b.slug,
        name: b.name,
        logo: b.logoUrl,
        summary: b.summary,
        productCount: b.productCount ?? 0,
      }));
    }

    // Search Categories
    if (type === "categories" || type === "all") {
      const categories = await prisma.productCategory.findMany({
        where: {
          OR: [
            { name: { contains: query } },
            { slug: { contains: query } },
            { description: { contains: query } },
          ],
        },
        take: Math.min(limit, 10),
        select: {
          id: true,
          slug: true,
          name: true,
          coverImage: true,
          description: true,
          productCount: true,
        },
        orderBy: [
          { productCount: "desc" },
          { name: "asc" },
        ],
      });

      results.categories = categories.map((c) => ({
        id: c.id,
        slug: c.slug,
        name: c.name,
        image: c.coverImage,
        description: c.description,
        productCount: c.productCount ?? 0,
      }));
    }

    const searchTime = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      data: {
        ...results,
        query,
        suggestions: generateSuggestions(query, results),
      },
      meta: {
        totalProducts: results.products.length,
        totalBrands: results.brands.length,
        totalCategories: results.categories.length,
        searchTime,
        limit,
      },
    });
  } catch (error) {
    console.error("Search API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Search failed",
        message: error instanceof Error ? error.message : "Unknown error",
        data: {
          products: [],
          brands: [],
          categories: [],
        },
      },
      { status: 500 }
    );
  }
}

// Generate search suggestions
function generateSuggestions(query: string, results: any): string[] {
  const suggestions = new Set<string>();

  // Add brand names from results
  results.products?.forEach((p: any) => {
    if (p.brand?.name) {
      suggestions.add(p.brand.name);
    }
  });

  // Add category names
  results.products?.forEach((p: any) => {
    if (p.category?.name) {
      suggestions.add(p.category.name);
    }
  });

  // Add product type variations
  results.products?.slice(0, 3).forEach((p: any) => {
    const words = p.name.split(/\s+/).filter((w: string) => w.length > 3);
    words.forEach((w: string) => suggestions.add(w));
  });

  return Array.from(suggestions).slice(0, 5);
}