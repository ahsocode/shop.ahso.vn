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
            sku: true,
            saleCode: true,
            price: true,
            listPrice: true,
            coverImage: true,
            currency: true,
            requiresQuote: true,
            status: true,
            brand: {
              select: {
                name: true,
                logoUrl: true,
              },
            },
          },
        },
      },
    });

    const data = items.map((item) => ({
      id: item.id,
      title: item.title || item.product.name,
      description: item.description,
      sortOrder: item.sortOrder,
      product: {
        ...item.product,
        brandName: item.product.brand?.name ?? null,
        brandLogo: item.product.brand?.logoUrl ?? null,
      },}));
return NextResponse.json({ data });
} catch (error) {
console.error("Featured products error:", error);
return NextResponse.json(
{ error: "Internal Server Error" },
{ status: 500 }
);
}
}