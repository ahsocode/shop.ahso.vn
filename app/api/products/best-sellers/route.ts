import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(Number(searchParams.get("limit")) || 10, 50);
    const categorySlug = searchParams.get("category");
    const typeSlug = searchParams.get("type");
    const brandSlug = searchParams.get("brand");

    const where: Prisma.productWhereInput = {
      status: "PUBLISHED",
      purchaseCount: { gt: 0 },
    };

    // Filter by brand
    if (brandSlug) {
      where.brand = {
        is: {
          slug: brandSlug,
        },
      };
    }

    // Filter by product type
    if (typeSlug) {
      where.producttype = {
        is: {
          slug: typeSlug,
        },
      };
    }

    // Filter by category
    if (categorySlug) {
      where.productcategorylink = {
        some: {
          productcategory: {
            is: {
              slug: categorySlug,
            },
          },
        },
      };
    }

    const products = await prisma.product.findMany({
      where,
      orderBy: [
        { purchaseCount: "desc" }, // Sắp xếp theo số lượng bán
        { ratingAvg: "desc" }, // Nếu bằng nhau thì ưu tiên đánh giá cao
      ],
      take: limit,
      select: {
        id: true,
        name: true,
        slug: true,
        sku: true,
        saleCode: true,
        description: true,
        price: true,
        listPrice: true,
        costPrice: true,
        coverImage: true,
        currency: true,
        requiresQuote: true,
        quoteNote: true,
        status: true,
        stockOnHand: true,
        stockReserved: true,
        minOrderQty: true,
        stepQty: true,
        taxRate: true,
        taxIncluded: true,
        purchaseCount: true,
        ratingAvg: true,
        ratingCount: true,
        viewCount: true,
        createdAt: true,
        publishAt: true,
        brand: {
          select: {
            id: true,
            name: true,
            slug: true,
            logoUrl: true,
          },
        },
        producttype: {
          select: {
            id: true,
            name: true,
            slug: true,
            productcategory: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
        productcategorylink: {
          select: {
            productcategory: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
      },
    });

    // Transform data
    const data = products.map((product) => {
      const { brand, producttype, productcategorylink, ...rest } = product;
      const price = Number(rest.price ?? 0);
      const listPrice = rest.listPrice != null ? Number(rest.listPrice) : null;
      const stockOnHand = Number(rest.stockOnHand ?? 0);
      const stockReserved = Number(rest.stockReserved ?? 0);
      
      return {
        ...rest,
        price,
        listPrice,
        stockOnHand,
        stockReserved,
        brand: brand
          ? {
              id: brand.id,
              name: brand.name,
              slug: brand.slug,
              logoUrl: brand.logoUrl,
            }
          : null,
        type: {
          id: producttype.id,
          name: producttype.name,
          slug: producttype.slug,
        },
        category: producttype.productcategory
          ? {
              id: producttype.productcategory.id,
              name: producttype.productcategory.name,
              slug: producttype.productcategory.slug,
            }
          : null,
        categories: productcategorylink.map((link) => ({
          id: link.productcategory.id,
          name: link.productcategory.name,
          slug: link.productcategory.slug,
        })),
        // Tính % giảm giá nếu có listPrice
        discountPercent:
          listPrice && listPrice > price
            ? Math.round(((listPrice - price) / listPrice) * 100)
            : 0,
        // Stock status
        stockStatus:
          stockOnHand > 0
            ? "in_stock"
            : stockOnHand === 0 && stockReserved > 0
            ? "low_stock"
            : "out_of_stock",
        availableStock: Math.max(0, stockOnHand - stockReserved),
      };
    });

    return NextResponse.json({
      data,
      meta: {
        total: data.length,
        limit,
        filters: {
          category: categorySlug,
          type: typeSlug,
          brand: brandSlug,
        },
      },
    });
  } catch (error) {
    console.error("Best sellers API error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
