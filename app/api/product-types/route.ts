import { randomUUID } from "crypto";
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

    const where: Prisma.producttypeWhereInput = {};
    if (categorySlug) where.productcategory = { slug: categorySlug };
    if (q) {
      where.OR = [
        { name: { contains: q } },
        { slug: { contains: q } },
      ];
    }

    const items = await prisma.producttype.findMany({
      where,
      orderBy: [
        { product: { _count: "desc" } },
        { name: "asc" },
      ],
      include: {
        productcategory: { select: { slug: true, name: true } },
        _count: { select: { product: true } },
      },
    });

    type ProductTypeItem = (typeof items)[number];

const data = items.map((item: ProductTypeItem) => {
  const { _count, productcategory, ...rest } = item;
  return {
    ...rest,
    category: productcategory,
    productCount: _count.product,
  };
});

    return NextResponse.json(
      {
        success: true,
        data,
        meta: { total: data.length },
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

    const cat = await prisma.productcategory.findUnique({ where: { slug: body.categorySlug } });
    if (!cat) {
      return NextResponse.json(
        { success: false, error: "categorySlug not found" },
        { status: 400 }
      );
    }

    const slug = body.slug ? String(body.slug) : slugify(body.name);

    const now = new Date();
    const created = await prisma.producttype.create({
      data: {
        id: randomUUID(),
        slug,
        name: body.name,
        coverImage: body.coverImage ?? null,
        description: body.description ?? null,
        categoryId: cat.id,
        createdAt: now,
        updatedAt: now,
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
