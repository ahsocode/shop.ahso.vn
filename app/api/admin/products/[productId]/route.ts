import { randomUUID } from "crypto";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyBearerAuth, requireRole } from "@/lib/auth";
import { jsonOk, jsonError, toHttpError } from "@/lib/http";
import { ProductUpdateSchema } from "@/lib/validators";
import { slugify } from "@/lib/slug";
import type {
  productGetPayload,
  productUpdateInput,
} from "@/lib/prisma-types";

/* ========= Types cho images & specs từ FE ========= */

type ImageInput = {
  url: string;
  alt?: string | null;
  sortOrder?: number | null;
};

type SpecInput = {
  name: string;
  valueString?: string | null;
  valueNumber?: number | null;
  valueBoolean?: boolean | null;
  unitOverride?: string | null;
  note?: string | null;
  sortOrder?: number | null;
};

/* ========= Select chung cho admin ========= */

const productSelect = {
  id: true,
  slug: true,
  name: true,
  sku: true,
  saleCode: true,
  description: true,
  coverImage: true,
  price: true,
  listPrice: true,
  costPrice: true,
  currency: true,
  status: true,
  brandId: true,
  typeId: true,
  supplierId: true,
  supplierSku: true,
  stockOnHand: true,
  stockReserved: true,
  reorderLevel: true,
  reorderQty: true,
  minOrderQty: true,
  stepQty: true,
  requiresQuote: true,
  quoteNote: true,
  taxRate: true,
  taxIncluded: true,
  profitAmount: true,
  profitMargin: true,
  publishAt: true,
  createdAt: true,
  updatedAt: true,

  brand: { select: { id: true, name: true } },
  producttype: { select: { id: true, name: true } },
  supplier: { select: { id: true, name: true } },

  productimage: {
    select: {
      id: true,
      url: true,
      alt: true,
      sortOrder: true,
      createdAt: true,
    },
    orderBy: { sortOrder: "asc" },
  },

  productspecvalue: {
    select: {
      id: true,
      valueString: true,
      valueNumber: true,
      valueBoolean: true,
      unitOverride: true,
      note: true,
      sortOrder: true,
      productspecdefinition: {
        select: { id: true, name: true, slug: true },
      },
    },
    orderBy: { sortOrder: "asc" },
  },
} as const;

type AdminProductRow = productGetPayload<{ select: typeof productSelect }>;

/* ========= mapProduct: trả structure đúng với trang edit ========= */

const mapProduct = (row: AdminProductRow | null) => {
  if (!row) return row;

  const {
    producttype,
    productimage,
    productspecvalue,
    supplier,
    ...rest
  } = row;

  return {
    ...rest,
    type: producttype,
    supplier,
    images: productimage,
    specs: productspecvalue.map((v) => ({
      id: v.id,
      name: v.productspecdefinition.name,
      valueString: v.valueString,
      valueNumber: v.valueNumber,
      valueBoolean: v.valueBoolean,
      unitOverride: v.unitOverride,
      note: v.note,
      sortOrder: v.sortOrder,
    })),
  };
};

/* ========= ép string → number cho payload PATCH ========= */

function normalizePayload(body: unknown) {
  const source: Record<string, unknown> =
    typeof body === "object" && body
      ? { ...(body as Record<string, unknown>) }
      : {};

  if (typeof source.price === "string") {
    source.price = Number(source.price);
  }
  if (typeof source.listPrice === "string") {
    source.listPrice = source.listPrice ? Number(source.listPrice) : undefined;
  }
  if (typeof source.stockOnHand === "string") {
    source.stockOnHand = Number(source.stockOnHand);
  }
  if (typeof source.costPrice === "string") {
    source.costPrice = source.costPrice ? Number(source.costPrice) : undefined;
  }
  if (typeof source.taxRate === "string") {
    source.taxRate = source.taxRate ? Number(source.taxRate) : undefined;
  }

  return source;
}

/* ============ GET /api/admin/products/[productId] ============ */

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ productId: string }> },
) {
  try {
    const { productId } = await params;
    const me = await verifyBearerAuth(_req);
    requireRole(me, ["ADMIN"]);

    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: productSelect,
    });

    if (!product) return jsonError("Not found", 404);

    return jsonOk({ data: mapProduct(product) });
  } catch (error) {
    const err = toHttpError(error);
    return jsonError(err.message || "Internal Error", err.status || 500);
  }
}

/* ============ PATCH /api/admin/products/[productId] ============ */

type RawBody = Record<string, unknown> & {
  images?: unknown;
  specs?: unknown;
};

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ productId: string }> },
) {
  try {
    const { productId } = await params;
    const me = await verifyBearerAuth(req);
    requireRole(me, ["ADMIN"]);

    // tách images & specs ra, phần còn lại cho ProductUpdateSchema
    const raw = (await req.json()) as RawBody;
    const rawImages = raw.images;
    const rawSpecs = raw.specs;

    // loại images/specs ra khỏi body để validate
    const { images: _ignoreImages, specs: _ignoreSpecs, ...rawForSchema } =
      raw;

    const body = normalizePayload(rawForSchema) as Record<string, unknown>;

    const parsed = ProductUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError("Validation Error", 400, {
        issues: parsed.error.issues,
      });
    }
    const data = parsed.data;

    // Chuẩn hoá slug
    if ("slug" in data && data.slug) data.slug = data.slug.trim();

    const updates: productUpdateInput = { ...data };

    // --- Validate & xử lý slug ---
    if (data.slug) {
      const slugTaken = await prisma.product.findFirst({
        where: { slug: data.slug, NOT: { id: productId } },
        select: { id: true },
      });
      if (slugTaken) return jsonError("Slug already exists", 409);
    } else if ("slug" in data && !data.slug) {
      updates.slug = slugify(data.name ?? "");
    }

    // --- Validate SKU ---
    if (data.sku) {
      const skuTaken = await prisma.product.findFirst({
        where: { sku: data.sku, NOT: { id: productId } },
        select: { id: true },
      });
      if (skuTaken) return jsonError("SKU already exists", 409);
    }

    // --- Validate type ---
    if (data.typeId) {
      const typeRow = await prisma.producttype.findUnique({
        where: { id: data.typeId },
      });
      if (!typeRow) return jsonError("typeId not found", 400);
    }

    // --- Validate brand ---
    if (data.brandId) {
      const brandRow = await prisma.brand.findUnique({
        where: { id: data.brandId },
      });
      if (!brandRow) return jsonError("brandId not found", 400);
    }

    // Product hiện tại để tính profit/publishAt
    const existing = await prisma.product.findUnique({
      where: { id: productId },
      select: {
        price: true,
        costPrice: true,
        status: true,
        publishAt: true,
      },
    });
    if (!existing) return jsonError("Not found", 404);

    // --- Tính lại tiền lời nếu cần ---
    const hasPriceChange = "price" in data;
    const hasCostChange = "costPrice" in data;

    if (hasPriceChange || hasCostChange) {
      const nextPrice =
        typeof data.price === "number" ? data.price : existing.price;
      const nextCost =
        "costPrice" in data
          ? (data.costPrice as number | null | undefined) ?? null
          : existing.costPrice;

      let profitAmount: number | null = null;
      let profitMargin: number | null = null;

      if (typeof nextPrice === "number" && typeof nextCost === "number") {
        profitAmount = nextPrice - nextCost;
        profitMargin = nextCost > 0 ? (profitAmount / nextCost) * 100 : null;
      }

      updates.profitAmount = profitAmount;
      updates.profitMargin = profitMargin;
    }

    // --- publishAt logic ---
    if ("status" in data && data.status) {
      if (data.status === "PUBLISHED") {
        updates.publishAt = existing.publishAt ?? new Date();
      } else {
        updates.publishAt = existing.publishAt;
      }
    }

    // --- khóa currency/taxIncluded ---
    if ("currency" in updates) {
      updates.currency = "VND";
    }
    if ("taxIncluded" in updates) {
      updates.taxIncluded = true;
    }

    /* ===== Chuẩn hoá images & specs từ raw ===== */

    let images: ImageInput[] | undefined;
    if (Array.isArray(rawImages)) {
      images = rawImages
        .map((img: unknown, idx: number): ImageInput | null => {
          const item = img as {
            url?: unknown;
            alt?: unknown;
            sortOrder?: unknown;
          };

          const url = String(item.url ?? "").trim();
          if (!url) return null;

          const sort =
            typeof item.sortOrder === "number"
              ? item.sortOrder
              : Number.isFinite(Number(item.sortOrder))
              ? Number(item.sortOrder)
              : idx;

          let alt: string | null = null;
          if (typeof item.alt === "string") {
            alt = item.alt;
          } else if (item.alt != null) {
            alt = String(item.alt);
          }

          return {
            url,
            alt,
            sortOrder: sort,
          };
        })
        .filter(Boolean) as ImageInput[];
    }

    let specs: SpecInput[] | undefined;
    if (Array.isArray(rawSpecs)) {
      specs = rawSpecs
        .map((s: unknown, idx: number): SpecInput | null => {
          const item = s as {
            name?: unknown;
            valueString?: unknown;
            unitOverride?: unknown;
            note?: unknown;
            sortOrder?: unknown;
          };

          const name = String(item.name ?? "").trim();
          if (!name) return null;

          const valueString =
            typeof item.valueString === "string"
              ? item.valueString.trim() || null
              : null;

          const unitOverride =
            typeof item.unitOverride === "string"
              ? item.unitOverride.trim() || null
              : null;

          const note =
            typeof item.note === "string" ? item.note.trim() || null : null;

          let sortOrder: number | null = null;
          if (typeof item.sortOrder === "number") {
            sortOrder = item.sortOrder;
          } else if (item.sortOrder != null && item.sortOrder !== "") {
            const n = Number(item.sortOrder);
            sortOrder = Number.isFinite(n) ? n : null;
          }

          return {
            name,
            valueString,
            valueNumber: null,
            valueBoolean: null,
            unitOverride,
            note,
            sortOrder: sortOrder ?? idx,
          };
        })
        .filter(Boolean) as SpecInput[];
    }

    /* ===== Transaction: update product + images + specs ===== */

    const updated = await prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id: productId },
        data: updates,
      });

      // images
      if (images) {
        await tx.productimage.deleteMany({ where: { productId } });
        for (const [idx, img] of images.entries()) {
          await tx.productimage.create({
            data: {
              id: randomUUID(),
              productId,
              url: img.url,
              alt: img.alt ?? null,
              sortOrder: img.sortOrder ?? idx,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          });
        }
      }

      // specs
      if (specs) {
        await tx.productspecvalue.deleteMany({ where: { productId } });

        const now = new Date();
        for (const [idx, spec] of specs.entries()) {
          const specSlug = slugify(spec.name);

          const def = await tx.productspecdefinition.upsert({
            where: { slug: specSlug },
            update: {
              name: spec.name,
              updatedAt: now,
            },
            create: {
              id: randomUUID(),
              name: spec.name,
              slug: specSlug,
              createdAt: now,
              updatedAt: now,
            },
          });

          await tx.productspecvalue.create({
            data: {
              id: randomUUID(),
              productId,
              specDefinitionId: def.id,
              valueString: spec.valueString ?? null,
              valueNumber: spec.valueNumber ?? null,
              valueBoolean: spec.valueBoolean ?? null,
              unitOverride: spec.unitOverride ?? null,
              note: spec.note ?? null,
              sortOrder: spec.sortOrder ?? idx,
              createdAt: now,
              updatedAt: now,
            },
          });
        }
      }

      return tx.product.findUnique({
        where: { id: productId },
        select: productSelect,
      });
    });

    if (!updated) return jsonError("Not found", 404);

    return jsonOk({ data: mapProduct(updated) });
  } catch (error) {
    const err = toHttpError(error);
    return jsonError(err.message || "Internal Error", err.status || 500);
  }
}

/* ============ DELETE /api/admin/products/[productId] ============ */

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ productId: string }> },
) {
  try {
    const { productId } = await params;
    const me = await verifyBearerAuth(req);
    requireRole(me, ["ADMIN"]);

    await prisma.product.delete({ where: { id: productId } });
    return jsonOk({ ok: true });
  } catch (error) {
    const err = toHttpError(error);
    return jsonError(err.message || "Internal Error", err.status || 500);
  }
}
