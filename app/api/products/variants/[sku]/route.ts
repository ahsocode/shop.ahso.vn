import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, context: { params: Promise<{ sku: string }> }) {
  try {
    const { sku } = await context.params;
    const row = await prisma.productVariant.findUnique({
      where: { variantSku: sku },
      select: {
        variantSku: true,
        mpn: true,
        barcode: true,
        price: true,
        listPrice: true,
        currency: true,
        taxIncluded: true,
        stockOnHand: true,
        stockReserved: true,
        brand: { select: { name: true, slug: true } },
        specs: { select: { id: true, keySlug: true, label: true, valueText: true, valueNumber: true, unit: true, sortOrder: true }, orderBy: { sortOrder: "asc" } },
        product: {
          select: {
            title: true,
            slug: true,
            summary: true,
            descriptionHtml: true,
            imagesCover: true,
            brand: { select: { name: true, slug: true } },
            images: { select: { id: true, url: true, alt: true, sortOrder: true }, orderBy: { sortOrder: "asc" } },
            docs: { select: { id: true, title: true, fileUrl: true, type: true } },
            categoryLinks: { select: { category: { select: { name: true, slug: true, fullSlug: true } } } },
          },
        },
      },
    });

    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const images = row.product?.images ?? [];
    const inStock = (row.stockOnHand ?? 0) - (row.stockReserved ?? 0) > 0;

    return NextResponse.json({
      data: {
        sku: row.variantSku,
        mpn: row.mpn,
        barcode: row.barcode,
        name: row.product?.title ?? row.variantSku,
        summary: row.product?.summary ?? null,
        descriptionHtml: row.product?.descriptionHtml ?? null,
        image: row.product?.imagesCover ?? null,
        images,
        docs: row.product?.docs ?? [],
        brand: row.brand ?? row.product?.brand ?? null,
        categories: row.product?.categoryLinks?.map((x) => x.category) ?? [],
        price: Number(row.price ?? 0),
        listPrice: row.listPrice != null ? Number(row.listPrice) : null,
        currency: row.currency,
        taxIncluded: row.taxIncluded,
        inStock,
        specs: row.specs,
      },
    });
  } catch (e) {
    console.error("GET /api/products/variants/[sku] error:", e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

