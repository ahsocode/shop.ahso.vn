import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function toInt(v: string | null, def = 1) {
  const n = v ? Number(v) : NaN;
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : def;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();
    const brand = (searchParams.get("brand") || "").trim(); // brand slug
    const category = (searchParams.get("category") || "").trim(); // category slug or fullSlug prefix
    const minPrice = searchParams.get("minPrice");
    const maxPrice = searchParams.get("maxPrice");
    const inStock = searchParams.get("inStock") === "true";
    const page = toInt(searchParams.get("page"), 1);
    const pageSize = toInt(searchParams.get("pageSize"), 12);
    const sort = (searchParams.get("sort") || "relevance").toLowerCase();

    const where: any = {};

    if (q) {
      where.OR = [
        { variantSku: { contains: q } },
        { mpn: { contains: q } },
        { product: { is: { title: { contains: q } } } },
        { product: { is: { summary: { contains: q } } } },
        { product: { is: { descriptionHtml: { contains: q } } } },
      ];
    }

    if (brand) {
      where.brand = { is: { slug: brand } };
    }

    if (category) {
      // match either exact slug or fullSlug prefix
      where.product = {
        is: {
          categoryLinks: {
            some: {
              OR: [
                { category: { slug: category } },
                { category: { fullSlug: { startsWith: category } } },
              ],
            },
          },
        },
      };
    }

    if (minPrice) where.price = { ...(where.price || {}), gte: Number(minPrice) };
    if (maxPrice) where.price = { ...(where.price || {}), lte: Number(maxPrice) };
    if (inStock) where.stockOnHand = { gt: 0 }; // approximation

    // Sorting
    const orderBy: any[] = [];
    switch (sort) {
      case "price_asc":
        orderBy.push({ price: "asc" });
        break;
      case "price_desc":
        orderBy.push({ price: "desc" });
        break;
      case "name_asc":
        orderBy.push({ product: { title: "asc" } });
        break;
      case "name_desc":
        orderBy.push({ product: { title: "desc" } });
        break;
      default:
        orderBy.push({ updatedAt: "desc" });
        orderBy.push({ product: { updatedAt: "desc" } });
        break;
    }

    const [total, rows] = await Promise.all([
      prisma.productVariant.count({ where }),
      prisma.productVariant.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          variantSku: true,
          price: true,
          currency: true,
          stockOnHand: true,
          stockReserved: true,
          brand: { select: { name: true, slug: true } },
          product: {
            select: {
              title: true,
              slug: true,
              imagesCover: true,
              categoryLinks: { select: { category: { select: { name: true, slug: true } } } },
            },
          },
        },
      }),
    ]);

    const data = rows.map((r) => {
      const cat = r.product?.categoryLinks?.[0]?.category || null;
      const inStockFlag = (r.stockOnHand ?? 0) - (r.stockReserved ?? 0) > 0;
      return {
        sku: r.variantSku,
        name: r.product?.title ?? r.variantSku,
        productSlug: r.product?.slug ?? null,
        brand: r.brand?.name ?? null,
        brandSlug: r.brand?.slug ?? null,
        category: cat,
        image: r.product?.imagesCover ?? null,
        price: Number(r.price ?? 0),
        currency: r.currency,
        inStock: inStockFlag,
      };
    });

    return NextResponse.json({ data, meta: { total, page, pageSize } });
  } catch (e) {
    console.error("GET /api/products/variants error:", e);
    return NextResponse.json({ data: [], meta: { total: 0, page: 1, pageSize: 12 } }, { status: 200 });
  }
}

export function OPTIONS() {
  return NextResponse.json(null, { status: 204 });
}
