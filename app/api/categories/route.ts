// app/api/categories/route.ts
import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client/index";
import { prisma } from "@/lib/prisma";

export const revalidate = 60; // Revalidate every 60 seconds

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") ?? undefined;

    const where: Prisma.productcategoryWhereInput = {
      ...(q && {
        OR: [
          { name: { contains: q } },
          { slug: { contains: q } },
        ],
      }),
    };

    const items = await prisma.productcategory.findMany({
      where,
      orderBy: [
        { productcategorylink: { _count: "desc" } },
        { name: "asc" },
      ],
      select: {
        id: true,
        slug: true,
        name: true,
        coverImage: true,
        description: true,
        _count: { select: { productcategorylink: true } },
      },
    });

    type CategoryItem = (typeof items)[number];

    const data = items.map((item: CategoryItem) => {
      const { _count, ...rest } = item;
      return {
        ...rest,
        productCount: _count.productcategorylink,
      };
    });

    // ✅ Format nhất quán: { success: true, data: [...], meta: {...} }
    return NextResponse.json(
      {
        success: true,
        data,
        meta: {
          total: data.length,
        },
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
        },
      }
    );
  } catch (error) {
    console.error("Error fetching categories:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch categories",
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

    if (!body.name) {
      return NextResponse.json(
        { success: false, error: "Missing name" },
        { status: 400 }
      );
    }

    const slug = body.slug ? String(body.slug) : slugify(body.name);

    // Check if slug already exists
    const existingCategory = await prisma.productcategory.findUnique({
      where: { slug },
    });

    if (existingCategory) {
      return NextResponse.json(
        { success: false, error: "Category with this slug already exists" },
        { status: 409 }
      );
    }

    const now = new Date();
    const category = await prisma.productcategory.create({
      data: {
        id: randomUUID(),
        slug,
        name: body.name,
        coverImage: body.coverImage ?? null,
        description: body.description ?? null,
        createdAt: now,
        updatedAt: now,
      },
    });

    return NextResponse.json(
      { success: true, data: category },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating category:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to create category",
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
