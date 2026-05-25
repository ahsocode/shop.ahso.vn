import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type {
  productGetPayload,
  productOrderByWithRelationInput,
  productWhereInput,
  productFindManyArgs,
} from "@/lib/prisma-types";

type ProductListRow = productGetPayload<{
  include: {
    brand: {
      select: {
        name: true;
        slug: true;
        logoUrl: true;
      };
    };
    producttype: {
      select: {
        slug: true;
        name: true;
        productcategory: {
          select: {
            name: true;
            slug: true;
          };
        };
      };
    };
    productimage: {
      select: {
        url: true;
        alt: true;
      };
      orderBy: { sortOrder: "asc" };
      take: 1;
    };
  };
}>;

type ProductCreateResponse = productGetPayload<{
  include: {
    brand: true;
    producttype: { include: { productcategory: true } };
    unitdefinition_product_unitIdTounitdefinition: true;
    unitdefinition_product_quantityUnitIdTounitdefinition: true;
  };
}>;

const mapListItem = (row: ProductListRow) => {
  const image = row.coverImage || row.productimage?.[0]?.url || "";
  const imageAlt = row.productimage?.[0]?.alt || row.name;
  const category = row.producttype?.productcategory;
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    sku: row.sku,
    image,
    imageAlt,
    brand: row.brand?.name ?? null,
    brandSlug: row.brand?.slug ?? null,
    brandLogo: row.brand?.logoUrl ?? null,
    category: category?.name ?? null,
    categorySlug: category?.slug ?? null,
    price: Number(row.price ?? 0),
    listPrice: row.listPrice ? Number(row.listPrice) : null,
    currency: row.currency ?? "VND",
    inStock: (row.stockOnHand ?? 0) > 0,
    stockOnHand: row.stockOnHand ?? 0,
    description: row.description ?? "",
    ratingAvg: row.ratingAvg ?? 0,
    ratingCount: row.ratingCount ?? 0,
    purchaseCount: row.purchaseCount ?? 0,
    requiresQuote: row.requiresQuote ?? false,
    isFeatured: row.isFeatured ?? false,
  };
};

const mapProductResponse = (row: ProductCreateResponse) => {
  const { producttype, unitdefinition_product_unitIdTounitdefinition, unitdefinition_product_quantityUnitIdTounitdefinition, ...rest } = row;
  return {
    ...rest,
    type: producttype ? { ...producttype, category: producttype.productcategory } : null,
    unit: unitdefinition_product_unitIdTounitdefinition,
    quantityUnit: unitdefinition_product_quantityUnitIdTounitdefinition,
  };
};

const PRODUCT_STATUSES = ["DRAFT", "PUBLISHED", "ARCHIVED"] as const;
type ProductStatus = (typeof PRODUCT_STATUSES)[number];

function normalizeStatus(value?: string | null): { isAll: boolean; status: ProductStatus | null } {
  if (!value) return { isAll: false, status: "PUBLISHED" };
  const upper = value.toUpperCase();
  if (upper === "ALL") return { isAll: true, status: null };
  return PRODUCT_STATUSES.includes(upper as ProductStatus)
    ? { isAll: false, status: upper as ProductStatus }
    : { isAll: false, status: "PUBLISHED" };
}

type SortDirection = "asc" | "desc";
type OrderByInput = productOrderByWithRelationInput | productOrderByWithRelationInput[];

function withStockPriority(
  base: productOrderByWithRelationInput | productOrderByWithRelationInput[]
): productOrderByWithRelationInput[] {
  return [{ stockOnHand: "desc" }, ...(Array.isArray(base) ? base : [base])];
}

function getOrderBy(sortField: string, order: SortDirection): OrderByInput {
  switch (sortField) {
    case "price":
      return withStockPriority({ price: order });
    case "name":
      return withStockPriority({ name: order });
    case "purchaseCount":
      return withStockPriority({ purchaseCount: order });
    case "ratingAvg":
      return withStockPriority({ ratingAvg: order });
    case "updatedAt":
      return withStockPriority({ updatedAt: order });
    default:
      return withStockPriority({ createdAt: order });
  }
}

function mapUiSort(value: string | null): OrderByInput | null {
  switch (value) {
    case "all":
      return withStockPriority({ updatedAt: "desc" });
    case "price_asc":
      return withStockPriority({ price: "asc" });
    case "price_desc":
      return withStockPriority({ price: "desc" });
    case "name_asc":
      return withStockPriority({ name: "asc" });
    case "name_desc":
      return withStockPriority({ name: "desc" });
    case "popular":
      return withStockPriority({ purchaseCount: "desc" });
    case "rating":
      return withStockPriority({ ratingAvg: "desc" });
    case "featured":
      return withStockPriority([{ isFeatured: "desc" }, { updatedAt: "desc" }]);
    case "updated_desc":
      return withStockPriority({ updatedAt: "desc" });
    default:
      return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // --- Paging (default 24) ---
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit =
      parseInt(searchParams.get("pageSize") || "") ||
      parseInt(searchParams.get("limit") || "") ||
      24;
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
    const sortByParam = searchParams.get("sortBy") || "createdAt";
    const sortOrderParam =
      (searchParams.get("sortOrder") as SortDirection | null) || "desc";
    const mappedOrder = mapUiSort(uiSort);
    const orderBy: OrderByInput =
      mappedOrder ?? getOrderBy(sortByParam, sortOrderParam);

    // --- Filters ---
    const brandSlug = searchParams.get("brand") || undefined;
    const typeSlug = searchParams.get("type") || undefined;
    const categorySlug = searchParams.get("category") || undefined;

    const minPrice = searchParams.get("minPrice");
    const maxPrice = searchParams.get("maxPrice");

    const inStock = searchParams.get("inStock") === "true";
    const statusParam = searchParams.get("status");

    // Build where clause
    const { isAll, status } = normalizeStatus(statusParam);
    const where: productWhereInput = {
      ...(!isAll && status && { status }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { description: { contains: search, mode: "insensitive" } },
          { sku: { contains: search, mode: "insensitive" } },
        ],
      }),
      ...(brandSlug && { brand: { is: { slug: brandSlug } } }),
      ...(typeSlug && { producttype: { is: { slug: typeSlug } } }),
      ...(categorySlug && {
        OR: [
          {
            productcategorylink: {
              some: {
                productcategory: { slug: categorySlug },
              },
            },
          },
          {
            producttype: {
              is: {
                productcategory: { slug: categorySlug },
              },
            },
          },
        ],
      }),
      ...((minPrice || maxPrice) && {
        price: {
          ...(minPrice && { gte: parseFloat(minPrice) }),
          ...(maxPrice && { lte: parseFloat(maxPrice) }),
        },
      }),
      ...(inStock && { stockOnHand: { gt: 0 } }),
    };

    // Build query options
    const queryOptions: productFindManyArgs = {
      where,
      orderBy,
      include: {
        brand: { select: { name: true, slug: true, logoUrl: true } },
        producttype: {
          select: {
            slug: true,
            name: true,
            productcategory: {
              select: { name: true, slug: true },
            },
          },
        },
        productimage: {
          orderBy: { sortOrder: "asc" },
          take: 1,
          select: { url: true, alt: true },
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

    // Execute queries together without interactive transaction (compatible with serverless DBs)
    const [items, count] = await Promise.all([
      prisma.product.findMany(queryOptions),
      prisma.product.count({ where }),
    ]);
    const rows = items as ProductListRow[];
    const total = count;

    // Map to client-friendly format
    const data = rows.map(mapListItem);

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
    const now = new Date();
    const { status: parsedStatus } = normalizeStatus(body.status);
    const productStatus = parsedStatus ?? "DRAFT";

    const product = await prisma.product.create({
      data: {
        id: randomUUID(),
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
        status: productStatus,
        publishAt: body.publishAt,
        metaTitle: body.metaTitle,
        metaDescription: body.metaDescription,
        updatedAt: now,
      },
      include: {
        brand: true,
        producttype: {
          include: {
            productcategory: true,
          },
        },
        unitdefinition_product_unitIdTounitdefinition: true,
        unitdefinition_product_quantityUnitIdTounitdefinition: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: mapProductResponse(product),
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
