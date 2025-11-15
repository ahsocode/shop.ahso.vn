// app/api/brands/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const revalidate = 60; // Revalidate every 60 seconds

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") ?? undefined;

    const where = q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" as const } },
            { slug: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {};

    const items = await prisma.brand.findMany({
      where,
      orderBy: [{ productCount: "desc" }, { name: "asc" }],
      select: {
        id: true,
        slug: true,
        name: true,
        logoUrl: true,
        summary: true,
        productCount: true,
      },
    });

    // ✅ Format nhất quán: { success: true, data: [...], meta: {...} }
    return NextResponse.json(
      {
        success: true,
        data: items,
        meta: {
          total: items.length,
        },
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
        },
      }
    );
  } catch (error) {
    console.error("Error fetching brands:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch brands",
        message: error instanceof Error ? error.message : "Unknown error",
        data: [], // ✅ Trả về mảng rỗng để client không crash
      },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const name: string = body.name;

    if (!name) {
      return NextResponse.json(
        { success: false, error: "Missing name" },
        { status: 400 }
      );
    }

    const slug = body.slug ? String(body.slug) : slugify(name);

    // Check if slug already exists
    const existingBrand = await prisma.brand.findUnique({
      where: { slug },
    });

    if (existingBrand) {
      return NextResponse.json(
        { success: false, error: "Brand with this slug already exists" },
        { status: 409 }
      );
    }

    const brand = await prisma.brand.create({
      data: {
        slug,
        name,
        logoUrl: body.logoUrl ?? null,
        summary: body.summary ?? null,
      },
    });

    return NextResponse.json(
      { success: true, data: brand },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating brand:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to create brand",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// Helper function (nếu chưa có trong @/lib/slug)
function slugify(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}