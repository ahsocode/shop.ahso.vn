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
      ...(type && { producttype: { is: { slug: type } } }),
      ...(category && {
        OR: [
          { productcategorylink: { some: { productcategory: { slug: category } } } },
          { producttype: { is: { productcategory: { slug: category } } } },
        ],
      }),
    };

    const whereByBrand = {
      ...baseWhere,
      ...(brand && { brand: { is: { slug: brand } } }),
    };

    const productTypeWhere = {
      ...(category && { productcategory: { slug: category } }),
      product: { some: whereByBrand },
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
          product: {
            where: baseWhere,
            select: { id: true },
          },
        },
      }),
      prisma.productcategory.findMany({
        where: {
          OR: [
            { productcategorylink: { some: { product: whereByBrand } } },
            { producttype: { some: { product: { some: whereByBrand } } } },
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
          productcategorylink: {
            where: { product: whereByBrand },
            select: { productId: true },
          },
        },
      }),
      prisma.producttype.findMany({
        where: productTypeWhere,
        orderBy: [
          { product: { _count: "desc" } },
          { name: "asc" },
        ],
        select: {
          id: true,
          name: true,
          slug: true,
          productcategory: { select: { name: true, slug: true } },
          product: {
            where: whereByBrand,
            select: { id: true },
          },
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
          productCount: b.product.length,
        })),
        categories: categoryOpts.map((c) => ({
          id: c.id,
          name: c.name,
          slug: c.slug,
          productCount: c.productcategorylink.length,
        })),
        productTypes: typeOpts.map((t) => ({
          id: t.id,
          name: t.name,
          slug: t.slug,
          category: t.productcategory,
          productCount: t.product.length,
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
