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

    const items = await prisma.brand.findMany({
      where,
      orderBy: [{ productCount: "desc" }, { name: "asc" }],
      select: { 
        id: true, 
        slug: true, 
        name: true, 
        logoUrl: true, 
        summary: true, 
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
    console.error("Error fetching brands:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: "Failed to fetch brands",
        message: error instanceof Error ? error.message : "Unknown error"
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
      where: { slug }
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
        summary: body.summary ?? null
      }
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
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}