// app/api/search/autocomplete/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Suggestion = {
  type: "product" | "brand" | "category" | "popular" | "search";
  text: string;
  subtext?: string;
  url?: string;
  image?: string | null;
  icon?: string;
};

export const dynamic = "force-dynamic";

// Cache popular searches (in production, use Redis)
const popularSearches = [
  "PLC Siemens",
  "Cảm biến Omron",
  "Biến tần Schneider",
  "Động cơ servo",
  "HMI",
  "Relay",
  "Contactor",
  "MCB",
];

/**
 * GET /api/search/autocomplete?q=keyword&limit=10
 * Fast autocomplete suggestions (MySQL compatible - no mode: "insensitive")
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q")?.trim() || "";
    const limit = Math.min(parseInt(searchParams.get("limit") || "10"), 20);

    if (!query || query.length < 2) {
      // Return popular searches if no query
      return NextResponse.json({
        success: true,
        data: {
          suggestions: popularSearches.slice(0, limit).map((text) => ({
            type: "popular",
            text,
            icon: "trending",
          })),
        },
        meta: {
          query: "",
          count: Math.min(popularSearches.length, limit),
        },
      });
    }

    const startTime = Date.now();

    // Parallel queries for better performance
    // Note: MySQL/SQLite default to case-insensitive for VARCHAR columns with *_ci collation
    const [productSuggestions, brandSuggestions, categorySuggestions] =
      await Promise.all([
        // Product name suggestions
        prisma.product.findMany({
          where: {
            AND: [
              {
                OR: [
                  { name: { contains: query } },
                  { sku: { contains: query } },
                ],
              },
              { status: "PUBLISHED" },
            ],
          },
          take: 5,
          select: {
            name: true,
            sku: true,
            slug: true,
            coverImage: true,
          },
          orderBy: [{ purchaseCount: "desc" }, { ratingAvg: "desc" }],
        }),

        // Brand suggestions
        prisma.brand.findMany({
          where: {
            OR: [
              { name: { contains: query } },
              { slug: { contains: query } },
            ],
          },
          take: 3,
          select: {
            name: true,
            slug: true,
            logoUrl: true,
          },
          orderBy: { productCount: "desc" },
        }),

        // Category suggestions
        prisma.productCategory.findMany({
          where: {
            OR: [
              { name: { contains: query } },
              { slug: { contains: query } },
            ],
          },
          take: 3,
          select: {
            name: true,
            slug: true,
            coverImage: true,
          },
          orderBy: { productCount: "desc" },
        }),
      ]);

    // Build suggestions array
    const suggestions: Suggestion[] = [];

    // Add product suggestions
    productSuggestions.forEach((p) => {
      suggestions.push({
        type: "product",
        text: p.name,
        subtext: p.sku,
        url: `/shop/products/${p.slug}`,
        image: p.coverImage,
        icon: "package",
      });
    });

    // Add brand suggestions
    brandSuggestions.forEach((b) => {
      suggestions.push({
        type: "brand",
        text: b.name,
        subtext: "Thương hiệu",
        url: `/shop/products?brand=${b.slug}`,
        image: b.logoUrl,
        icon: "award",
      });
    });

    // Add category suggestions
    categorySuggestions.forEach((c) => {
      suggestions.push({
        type: "category",
        text: c.name,
        subtext: "Danh mục",
        url: `/shop/products?category=${c.slug}`,
        image: c.coverImage,
        icon: "grid",
      });
    });

    // Add "search all" option if we have results
    if (suggestions.length > 0) {
      suggestions.unshift({
        type: "search",
        text: query,
        subtext: `Tìm kiếm "${query}"`,
        url: `/shop/products?q=${encodeURIComponent(query)}`,
        icon: "search",
      });
    }

    // Limit results
    const limitedSuggestions = suggestions.slice(0, limit);

    const searchTime = Date.now() - startTime;

    return NextResponse.json(
      {
        success: true,
        data: {
          suggestions: limitedSuggestions,
          query,
        },
        meta: {
          count: limitedSuggestions.length,
          searchTime,
        },
      },
      {
        headers: {
          "Cache-Control": "public, max-age=30, s-maxage=60",
        },
      }
    );
  } catch (error) {
    console.error("Autocomplete API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Autocomplete failed",
        data: { suggestions: [] },
      },
      { status: 500 }
    );
  }
}
