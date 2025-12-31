import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const now = new Date();
  const newThreshold = new Date();
  newThreshold.setDate(newThreshold.getDate() - 30);

  try {
    const [hero, featured, best, topRated, newArrivals] = await Promise.all([
      prisma.herobanner.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          imageUrl: true,
          title: true,
          content: true,
          ctaLabel: true,
          ctaHref: true,
          sortOrder: true,
          overlayOn: true,
          overlayColor: true,
          textPosition: true,
        },
      }),
      prisma.featuredproduct.findMany({
        where: {
          isActive: true,
          OR: [
            { startDate: null, endDate: null },
            { startDate: null, endDate: { gte: now } },
            { startDate: { lte: now }, endDate: null },
            { startDate: { lte: now }, endDate: { gte: now } },
          ],
        },
        orderBy: { sortOrder: "asc" },
        take: 6,
        select: {
          id: true,
          title: true,
          description: true,
          sortOrder: true,
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
              price: true,
              listPrice: true,
              coverImage: true,
              requiresQuote: true,
              brand: { select: { name: true, slug: true } },
            },
          },
        },
      }),
      prisma.product.findMany({
        where: { status: "PUBLISHED", purchaseCount: { gt: 0 } },
        orderBy: [{ purchaseCount: "desc" }, { ratingAvg: "desc" }],
        take: 6,
        select: {
          id: true,
          name: true,
          slug: true,
          price: true,
          listPrice: true,
          coverImage: true,
          requiresQuote: true,
          ratingAvg: true,
          ratingCount: true,
          purchaseCount: true,
          brand: { select: { name: true, slug: true } },
          producttype: {
            select: {
              name: true,
              slug: true,
              productcategory: { select: { name: true, slug: true } },
            },
          },
        },
      }),
      prisma.product.findMany({
        where: { status: "PUBLISHED", ratingAvg: { gte: 3 }, ratingCount: { gte: 1 } },
        orderBy: [{ ratingAvg: "desc" }, { ratingCount: "desc" }, { purchaseCount: "desc" }],
        take: 6,
        select: {
          id: true,
          name: true,
          slug: true,
          price: true,
          listPrice: true,
          coverImage: true,
          requiresQuote: true,
          ratingAvg: true,
          ratingCount: true,
          purchaseCount: true,
          brand: { select: { name: true, slug: true } },
          producttype: {
            select: {
              name: true,
              slug: true,
              productcategory: { select: { name: true, slug: true } },
            },
          },
        },
      }),
      prisma.product.findMany({
        where: { status: "PUBLISHED", publishAt: { gte: newThreshold } },
        orderBy: [{ publishAt: "desc" }, { createdAt: "desc" }],
        take: 6,
        select: {
          id: true,
          name: true,
          slug: true,
          price: true,
          listPrice: true,
          coverImage: true,
          requiresQuote: true,
          ratingAvg: true,
          ratingCount: true,
          purchaseCount: true,
          brand: { select: { name: true, slug: true } },
          producttype: {
            select: {
              name: true,
              slug: true,
              productcategory: { select: { name: true, slug: true } },
            },
          },
        },
      }),
    ]);

    const mapProduct = (p: (typeof best)[number]) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      image: p.coverImage || "/logo.png",
      price: p.price != null ? Number(p.price) : null,
      listPrice: p.listPrice != null ? Number(p.listPrice) : null,
      requiresQuote: Boolean(p.requiresQuote),
      ratingAvg: p.ratingAvg != null ? Number(p.ratingAvg) : null,
      ratingCount: p.ratingCount != null ? Number(p.ratingCount) : null,
      purchaseCount: "purchaseCount" in p ? (p.purchaseCount != null ? Number(p.purchaseCount) : null) : null,
      brand: p.brand ? { name: p.brand.name, slug: p.brand.slug } : null,
      type: p.producttype ? { name: p.producttype.name, slug: p.producttype.slug } : null,
      category: p.producttype?.productcategory
        ? { name: p.producttype.productcategory.name, slug: p.producttype.productcategory.slug }
        : null,
    });

    const data = {
      hero,
      featured: featured.map((item) => ({
        id: item.id,
        title: item.title || item.product?.name || "",
        description: item.description,
        sortOrder: item.sortOrder,
        product: item.product
          ? {
              id: item.product.id,
              name: item.product.name,
              slug: item.product.slug,
              image: item.product.coverImage || "/logo.png",
              price: item.product.price != null ? Number(item.product.price) : null,
              listPrice: item.product.listPrice != null ? Number(item.product.listPrice) : null,
              requiresQuote: Boolean(item.product.requiresQuote),
              brand: item.product.brand
                ? { name: item.product.brand.name, slug: item.product.brand.slug }
                : null,
            }
          : null,
      })),
      bestSellers: best.map(mapProduct),
      topRated: topRated.map(mapProduct),
      newArrivals: newArrivals.map(mapProduct),
    };

    return NextResponse.json({ data, meta: { daysNew: 30 } });
  } catch (error) {
    console.error("Home feed error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
