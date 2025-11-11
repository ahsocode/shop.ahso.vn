import { NextRequest, NextResponse } from "next/server";
import { PrismaClient, PublishStatus, Prisma } from "@prisma/client";
const prisma = new PrismaClient();

// Define the product with includes for type safety
type ProductWithRelations = Prisma.ProductGetPayload<{
  include: {
    brand: {
      select: {
        name: true;
        slug: true;
        logoUrl: true;
      };
    };
    type: {
      select: {
        slug: true;
        name: true;
        category: {
          select: {
            name: true;
            slug: true;
          };
        };
      };
    };
    images: {
      select: {
        url: true;
        alt: true;
      };
    };
  };
}>;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // --- Paging (default 12) ---
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit =
      parseInt(searchParams.get("pageSize") || "") ||
      parseInt(searchParams.get("limit") || "") ||
      12;
    const skip = (page - 1) * limit;

    // --- Cursor-based pagination option (for infinite scroll) ---
    const cursor = searchParams.get("cursor") || undefined;
    const useCursor = !!cursor;

    // --- Search & Sort ---
    const search =
      searchParams.get("q") ??
      searchParams.get("search") ??
      "";

    const uiSort = searchParams.get("sort");
    let sortBy = searchParams.get("sortBy") || "createdAt";
    let sortOrder: "asc" | "desc" =
      (searchParams.get("sortOrder") as "asc" | "desc") || "desc";
    
    if (uiSort) {
      switch (uiSort) {
        case "price_asc":  sortBy = "price"; sortOrder = "asc"; break;
        case "price_desc": sortBy = "price"; sortOrder = "desc"; break;
        case "name_asc":   sortBy = "name";  sortOrder = "asc"; break;
        case "name_desc":  sortBy = "name";  sortOrder = "desc"; break;
        case "popular":    sortBy = "purchaseCount"; sortOrder = "desc"; break;
        case "rating":     sortBy = "ratingAvg"; sortOrder = "desc"; break;
        default:           sortBy = "createdAt"; sortOrder = "desc";
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
    const statusParam = searchParams.get("status") || "PUBLISHED";

    // Build where clause
    const where: any = {};
    
    // Status filter - default to PUBLISHED only
    if (statusParam === "ALL") {
      // No status filter
    } else {
      where.status = statusParam as PublishStatus;
    }
    
    // Search - optimized with OR
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { sku: { contains: search, mode: "insensitive" } },
      ];
    }
    
    // Brand filter
    if (brandSlug) {
      where.brand = { is: { slug: brandSlug } };
    }
    
    // Type filter
    if (typeSlug) {
      where.type = { is: { slug: typeSlug } };
    }
    
    // Category filter
    if (categorySlug) {
      where.categoryLinks = { 
        some: { 
          category: { slug: categorySlug } 
        } 
      };
    }
    
    // Price range
    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price.gte = parseFloat(minPrice);
      if (maxPrice) where.price.lte = parseFloat(maxPrice);
    }
    
    // Stock filter
    if (inStock) {
      where.stockOnHand = { gt: 0 };
    }

    // Build query options
    const queryOptions: any = {
      where,
      orderBy,
      include: {
        brand: { select: { name: true, slug: true, logoUrl: true } },
        type: { 
          select: { 
            slug: true, 
            name: true, 
            category: { 
              select: { name: true, slug: true } 
            } 
          } 
        },
        images: { 
          orderBy: { sortOrder: "asc" }, 
          take: 1,
          select: { url: true, alt: true }
        },
      },
    };

    // Apply pagination strategy
    if (useCursor) {
      // Cursor-based pagination (better for infinite scroll & deep pagination)
      queryOptions.cursor = { id: cursor };
      queryOptions.skip = 1; // Skip the cursor itself
      queryOptions.take = limit;
    } else {
      // Offset pagination (better for numbered pages on shallow pagination)
      queryOptions.skip = skip;
      queryOptions.take = limit;
    }

    // Execute queries in transaction for consistency
    const [rows, total] = await prisma.$transaction([
      prisma.product.findMany(queryOptions),
      prisma.product.count({ where }),
    ]);

    // Map to client-friendly format
    const data = (rows as ProductWithRelations[]).map((p) => ({
      id: p.id,
      slug: p.slug,
      name: p.name,
      sku: p.sku,
      image: p.coverImage || p.images?.[0]?.url || "",
      imageAlt: p.images?.[0]?.alt || p.name,
      brand: p.brand?.name ?? null,
      brandSlug: p.brand?.slug ?? null,
      brandLogo: p.brand?.logoUrl ?? null,
      category: p.type?.category?.name ?? null,
      categorySlug: p.type?.category?.slug ?? null,
      price: Number(p.price ?? 0),
      listPrice: p.listPrice ? Number(p.listPrice) : null,
      currency: p.currency ?? "VND",
      inStock: (p.stockOnHand ?? 0) > 0,
      stockOnHand: p.stockOnHand ?? 0,
      
      // Additional fields
      description: p.description ?? "",
      ratingAvg: p.ratingAvg ?? 0,
      ratingCount: p.ratingCount ?? 0,
      purchaseCount: p.purchaseCount ?? 0,
    }));

    // Calculate pagination metadata
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const hasNext = useCursor ? rows.length === limit : page < totalPages;
    const hasPrev = useCursor ? !!cursor : page > 1;
    
    // For cursor pagination, include the cursor for next page
    const nextCursor = useCursor && rows.length > 0 
      ? rows[rows.length - 1].id 
      : undefined;

    return NextResponse.json({
      success: true,
      data,
      meta: {
        page: useCursor ? undefined : page,
        limit,
        total,
        totalPages: useCursor ? undefined : totalPages,
        hasNext,
        hasPrev,
        cursor: useCursor ? nextCursor : undefined,
      },
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: "Failed to fetch products", 
        message: error instanceof Error ? error.message : "Unknown error" 
      },
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
      select: { id: true }
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
      select: { id: true }
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