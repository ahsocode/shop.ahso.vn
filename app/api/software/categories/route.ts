import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const revalidate = 60;

export async function GET() {
  try {
    const rows = await prisma.softwareCategory.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, slug: true, name: true },
    });
    return NextResponse.json({ data: rows });
  } catch (e) {
    console.error("GET /api/software/categories error:", e);
    return NextResponse.json({ data: [] }, { status: 200 });
  }
}

export function OPTIONS() {
  return NextResponse.json(null, { status: 204 });
}

