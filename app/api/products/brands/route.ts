import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const revalidate = 60;

export async function GET() {
  try {
    const rows = await prisma.brand.findMany({
      orderBy: [{ variantCount: "desc" }, { name: "asc" }],
      select: { id: true, name: true, slug: true, variantCount: true },
    });
    return NextResponse.json({ data: rows });
  } catch (e) {
    console.error("GET /api/products/brands error:", e);
    return NextResponse.json({ data: [] }, { status: 200 });
  }
}

