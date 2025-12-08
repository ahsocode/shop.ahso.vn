import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Luôn chạy động để không bị prerender khi dùng request data
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const brand = searchParams.get("brand") ?? undefined;
    const category = searchParams.get("category") ?? undefined;
    const type = searchParams.get("type") ?? undefined;

    const baseWhere = {
      status: "PUBLISHED" as const,
      ...(brand && { brand: { is: { slug: brand } } }),
      ...(type && { producttype: { is: { slug: type } } }),
      ...(category && {
        OR: [
          {
            productcategorylink: {
              some: { productcategory: { slug: category } },
            },
          },
          {
            producttype: { is: { productcategory: { slug: category } } },
          },
        ],
      }),
    };

    const [brandOpts, categoryOpts, typeOpts] = await Promise.all([
      prisma.brand.findMany({
        where: {
          product: {
            some: baseWhere,
          },
        },
        orderBy: [
          { product: { _count: "desc" } },
          { name: "asc" },
        ],
        select: {
          id: true,
          name: true,
          slug: true,
          _count: { select: { product: true } },
        },
      }),
      prisma.productcategory.findMany({
        where: {
          OR: [
            {
              productcategorylink: {
                some: { product: baseWhere },
              },
            },
            {
              producttype: {
                some: { product: { some: baseWhere } },
              },
            },
          ],
        },
        orderBy: [
          { productcategorylink: { _count: "desc" } },
          { name: "asc" },
        ],
        select: {
          id: true,
          name: true,
          slug: true,
          _count: { select: { productcategorylink: true } },
        },
      }),
      prisma.producttype.findMany({
        where: {
          product: {
            some: baseWhere,
          },
        },
        orderBy: [
          { product: { _count: "desc" } },
          { name: "asc" },
        ],
        select: {
          id: true,
          name: true,
          slug: true,
          productcategory: { select: { name: true, slug: true } },
          _count: { select: { product: true } },
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        brands: brandOpts.map((b) => ({
          id: b.id,
          name: b.name,
          slug: b.slug,
          productCount: b._count.product,
        })),
        categories: categoryOpts.map((c) => ({
          id: c.id,
          name: c.name,
          slug: c.slug,
          productCount: c._count.productcategorylink,
        })),
        productTypes: typeOpts.map((t) => ({
          id: t.id,
          name: t.name,
          slug: t.slug,
          category: t.productcategory,
          productCount: t._count.product,
        })),
      },
    });
  } catch (error) {
    console.error("Filter options error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load filter options" },
      { status: 500 },
    );
  }
}
