import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(Number(searchParams.get("limit")) || 10, 50);
    
    const now = new Date();
    
    const items = await prisma.featuredproduct.findMany({
      where: {
        isActive: true,
        OR: [
          { startDate: null, endDate: null },
          { startDate: null, endDate: { gte: now } },
          { startDate: { lte: now }, endDate: null },
          { startDate: { lte: now }, endDate: { gte: now } },
        ],
      },
      orderBy: { sortOrder: "asc" },
      take: limit,
      select: {
        id: true,
        title: true,
        description: true,
        sortOrder: true,
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            price: true,
            listPrice: true,
            coverImage: true,
            requiresQuote: true,
            brand: {
              select: {
                name: true,
                slug: true,
              },
            },
          },
        },
      },
    });

    const data = items.map((item) => ({
      id: item.id,
      title: item.title || item.product?.name || "",
      description: item.description,
      sortOrder: item.sortOrder,
      product: item.product
        ? {
            id: item.product.id,
            name: item.product.name,
            slug: item.product.slug,
            image: item.product.coverImage || "/logo.png",
            price: item.product.price != null ? Number(item.product.price) : null,
            listPrice: item.product.listPrice != null ? Number(item.product.listPrice) : null,
            requiresQuote: Boolean(item.product.requiresQuote),
            brand: item.product.brand
              ? { name: item.product.brand.name, slug: item.product.brand.slug }
              : null,
          }
        : null,
    }));

    return NextResponse.json({ data, meta: { total: data.length, limit } });
  } catch (error) {
    console.error("Featured products error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
