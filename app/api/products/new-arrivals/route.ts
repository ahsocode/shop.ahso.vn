import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(Number(searchParams.get("limit")) || 10, 50);
    const days = Number(searchParams.get("days")) || 30; // default: 30-day window

    // Date threshold for "new" products
    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - days);

    const where: Prisma.productWhereInput = {
      status: "PUBLISHED",
      publishAt: { gte: dateThreshold },
    };

    const products = await prisma.product.findMany({
      where,
      orderBy: [{ publishAt: "desc" }, { createdAt: "desc" }],
      take: limit,
      select: {
        id: true,
        name: true,
        slug: true,
        price: true,
        listPrice: true,
        coverImage: true,
        requiresQuote: true,
        publishAt: true,
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
        brand: brand ? { name: brand.name, slug: brand.slug } : null,
        type: producttype ? { name: producttype.name, slug: producttype.slug } : null,
        category: producttype?.productcategory
          ? {
              name: producttype.productcategory.name,
              slug: producttype.productcategory.slug,
            }
          : null,
        isNew: Boolean(rest.publishAt && rest.publishAt >= dateThreshold),
      };
    });

    return NextResponse.json({
      data,
      meta: {
        total: data.length,
        limit,
        days,
      },
    });
  } catch (error) {
    console.error("New arrivals API error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
