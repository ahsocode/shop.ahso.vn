import { NextRequest, NextResponse } from "next/server";
import { PrismaClient, PublishStatus } from "@prisma/client";
const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // --- Paging (mặc định 12) ---
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit =
      parseInt(searchParams.get("pageSize") || "") ||
      parseInt(searchParams.get("limit") || "") ||
      12;
    const skip = (page - 1) * limit;

    // --- Search & Sort ---
    const search =
      searchParams.get("q") ??
      searchParams.get("search") ??
      "";

    const uiSort = searchParams.get("sort"); // relevance | price_asc | price_desc | name_asc | name_desc
    let sortBy = searchParams.get("sortBy") || "createdAt";
    let sortOrder: "asc" | "desc" =
      (searchParams.get("sortOrder") as "asc" | "desc") || "desc";
    if (uiSort) {
      switch (uiSort) {
        case "price_asc":  sortBy = "price"; sortOrder = "asc"; break;
        case "price_desc": sortBy = "price"; sortOrder = "desc"; break;
        case "name_asc":   sortBy = "name";  sortOrder = "asc"; break;
        case "name_desc":  sortBy = "name";  sortOrder = "desc"; break;
        default:           sortBy = "createdAt"; sortOrder = "desc"; // relevance
      }
    }
    const orderBy: any = { [sortBy]: sortOrder };

    // --- Filters ---
    const brandSlug = searchParams.get("brand") || undefined;
    const typeSlug = searchParams.get("type") || undefined;
    const categorySlug = searchParams.get("category") || undefined;

    const minPrice = searchParams.get("minPrice");
    const maxPrice = searchParams.get("maxPrice");

    const inStock = searchParams.get("inStock") === "true";
    const statusParam = searchParams.get("status") || "ALL";

    const where: any = {};
    if (statusParam !== "ALL") {
      where.status = statusParam as PublishStatus;
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { sku: { contains: search, mode: "insensitive" } },
      ];
    }
    if (brandSlug)  where.brand = { is: { slug: brandSlug } };
    if (typeSlug)   where.type  = { is: { slug: typeSlug } };
    if (categorySlug) {
      where.categoryLinks = { some: { category: { slug: categorySlug } } };
    }
    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price.gte = parseFloat(minPrice);
      if (maxPrice) where.price.lte = parseFloat(maxPrice);
    }
    if (inStock) {
      where.AND = [...(where.AND || []), { stockOnHand: { gt: 0 } }];
    }

    // --- Query ---
    const [rows, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          brand: { select: { name: true, slug: true } },
          type: { select: { slug: true, name: true, category: { select: { name: true, slug: true } } } },
          images: { orderBy: { sortOrder: "asc" }, take: 1 },
        },
      }),
      prisma.product.count({ where }),
    ]);

    // --- Map ra ProductCard cho client (bổ sung description, rating*) ---
    const data = rows.map((p) => ({
      slug: p.slug,
      name: p.name,
      sku: p.sku,
      image: p.coverImage || p.images?.[0]?.url || "",
      brand: p.brand?.name ?? null,
      brandSlug: p.brand?.slug ?? null,
      category: p.type?.category?.name ?? null,
      price: Number(p.price ?? 0),
      currency: p.currency ?? null,
      inStock: (p.stockOnHand ?? 0) - (p.stockReserved ?? 0) > 0,

      // mới
      description: p.description ?? "",
      ratingAvg: p.ratingAvg ?? 0,
      ratingCount: p.ratingCount ?? 0,
      purchaseCount: p.purchaseCount ?? 0,
    }));

    const totalPages = Math.max(1, Math.ceil(total / limit));
    return NextResponse.json({
      success: true,
      data,
      meta: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch products", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}


export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    const { name, sku, typeId, price } = body;
    if (!name || !sku || !typeId || !price) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: name, sku, typeId, price',
        },
        { status: 400 }
      );
    }

    // Check if SKU already exists
    const existingSku = await prisma.product.findUnique({
      where: { sku },
    });

    if (existingSku) {
      return NextResponse.json(
        {
          success: false,
          error: 'Product with this SKU already exists',
        },
        { status: 409 }
      );
    }

    // Generate slug from name if not provided
    const slug =
      body.slug ||
      name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

    // Check if slug already exists
    const existingSlug = await prisma.product.findUnique({
      where: { slug },
    });

    if (existingSlug) {
      return NextResponse.json(
        {
          success: false,
          error: 'Product with this slug already exists',
        },
        { status: 409 }
      );
    }

    // Create product
    const product = await prisma.product.create({
      data: {
        name,
        slug,
        sku,
        description: body.description,
        coverImage: body.coverImage,
        price: body.price,
        listPrice: body.listPrice,
        currency: body.currency || 'VND',
        taxIncluded: body.taxIncluded ?? true,
        stockOnHand: body.stockOnHand || 0,
        stockReserved: body.stockReserved || 0,
        weightGrams: body.weightGrams,
        lengthMm: body.lengthMm,
        widthMm: body.widthMm,
        heightMm: body.heightMm,
        typeId,
        brandId: body.brandId,
        unitId: body.unitId,
        quantityValue: body.quantityValue,
        quantityUnitId: body.quantityUnitId,
        quantityLabel: body.quantityLabel,
        minOrderQty: body.minOrderQty || 1,
        stepQty: body.stepQty || 1,
        status: body.status || PublishStatus.DRAFT,
        publishAt: body.publishAt,
        metaTitle: body.metaTitle,
        metaDescription: body.metaDescription,
      },
      include: {
        brand: true,
        type: {
          include: {
            category: true,
          },
        },
        unit: true,
        quantityUnit: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: product,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating product:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create product',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}