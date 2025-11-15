import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";

export const revalidate = 60;

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const categorySlug = searchParams.get("category") ?? undefined;
    const q = searchParams.get("q") ?? undefined;

    const where: Prisma.ProductTypeWhereInput = {};
    if (categorySlug) where.category = { slug: categorySlug };
    if (q) {
      where.OR = [
        { name: { contains: q } },
        { slug: { contains: q } },
      ];
    }

    const items = await prisma.productType.findMany({
      where,
      orderBy: [{ productCount: "desc" }, { name: "asc" }],
      include: {
        category: { select: { slug: true, name: true } },
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: items,
        meta: { total: items.length },
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
        },
      }
    );
  } catch (error) {
    console.error("Error fetching product types:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch product types",
        message: error instanceof Error ? error.message : "Unknown error",
        data: [],
      },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body.name || !body.categorySlug) {
      return NextResponse.json(
        { success: false, error: "Missing name or categorySlug" },
        { status: 400 }
      );
    }

    const cat = await prisma.productCategory.findUnique({ where: { slug: body.categorySlug } });
    if (!cat) {
      return NextResponse.json(
        { success: false, error: "categorySlug not found" },
        { status: 400 }
      );
    }

    const slug = body.slug ? String(body.slug) : slugify(body.name);

    const created = await prisma.productType.create({
      data: {
        slug,
        name: body.name,
        coverImage: body.coverImage ?? null,
        description: body.description ?? null,
        categoryId: cat.id,
      },
    });

    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (error) {
    console.error("Error creating product type:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to create product type",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
