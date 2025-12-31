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
      ...(brandSlug && { brand: { slug: brandSlug } }),
      ...(typeSlug && { producttype: { slug: typeSlug } }),
      ...(categorySlug && {
        productcategorylink: {
          some: { productcategory: { slug: categorySlug } },
        },
      }),
    };

    const products = await prisma.product.findMany({
      where,
      orderBy: [{ purchaseCount: "desc" }, { ratingAvg: "desc" }],
      take: limit,
      select: {
        id: true,
        name: true,
        slug: true,
        price: true,
        listPrice: true,
        coverImage: true,
        requiresQuote: true,
        ratingAvg: true,
        ratingCount: true,
        purchaseCount: true,
        brand: {
          select: {
            name: true,
            slug: true,
          },
        },
        producttype: {
          select: {
            name: true,
            slug: true,
            productcategory: {
              select: {
                name: true,
                slug: true,
              },
            },
          },
        },
      },
    });

    const data = products.map((product) => {
      const { brand, producttype, ...rest } = product;
      return {
        id: rest.id,
        name: rest.name,
        slug: rest.slug,
        image: rest.coverImage || "/logo.png",
        price: rest.price != null ? Number(rest.price) : null,
        listPrice: rest.listPrice != null ? Number(rest.listPrice) : null,
        requiresQuote: Boolean(rest.requiresQuote),
        ratingAvg: rest.ratingAvg != null ? Number(rest.ratingAvg) : null,
        ratingCount: rest.ratingCount != null ? Number(rest.ratingCount) : null,
        purchaseCount: rest.purchaseCount != null ? Number(rest.purchaseCount) : null,
        brand: brand ? { name: brand.name, slug: brand.slug } : null,
        type: producttype ? { name: producttype.name, slug: producttype.slug } : null,
        category: producttype?.productcategory
          ? { name: producttype.productcategory.name, slug: producttype.productcategory.slug }
          : null,
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
