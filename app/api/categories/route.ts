import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") ?? undefined;

    const where = q
      ? { OR: [{ name: { contains: q } }, { slug: { contains: q } }] }
      : {};

    const items = await prisma.productCategory.findMany({
      where,
      orderBy: [{ productCount: "desc" }, { name: "asc" }],
      select: { 
        id: true, 
        slug: true, 
        name: true, 
        coverImage: true, 
        description: true, 
        productCount: true 
      }
    });

    // Trả về format nhất quán với products API
    return NextResponse.json({ 
      success: true,
      data: items,
      meta: {
        total: items.length
      }
    });
  } catch (error) {
    console.error("Error fetching categories:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: "Failed to fetch categories",
        message: error instanceof Error ? error.message : "Unknown error"
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
    const existingCategory = await prisma.productCategory.findUnique({
      where: { slug }
    });

    if (existingCategory) {
      return NextResponse.json(
        { success: false, error: "Category with this slug already exists" },
        { status: 409 }
      );
    }

    const category = await prisma.productCategory.create({
      data: {
        slug,
        name: body.name,
        coverImage: body.coverImage ?? null,
        description: body.description ?? null
      }
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
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}