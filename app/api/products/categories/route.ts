import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const revalidate = 60;

export async function GET() {
  try {
    const rows = await prisma.category.findMany({
      orderBy: [{ level: "asc" }, { fullSlug: "asc" }],
      select: { id: true, name: true, slug: true, fullSlug: true, level: true, productCount: true, variantCount: true, parentId: true },
    });
    return NextResponse.json({ data: rows });
  } catch (e) {
    console.error("GET /api/products/categories error:", e);
    return NextResponse.json({ data: [] }, { status: 200 });
  }
}

