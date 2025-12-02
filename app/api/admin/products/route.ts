import { randomUUID } from "crypto";
import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { verifyBearerAuth, requireRole } from "@/lib/auth";
import { parsePaging, jsonOk, jsonError, toHttpError } from "@/lib/http";
import { slugify } from "@/lib/slug";
import { ProductCreateSchema, PublishStatusEnum } from "@/lib/validators";
import type { productWhereInput } from "@/lib/prisma-types";

type ImageInput = {
  url: string;
  alt?: string | null;
  sortOrder?: number;
};

type SpecInput = {
  name: string;
  valueString?: string | null;
  valueNumber?: number | null;
  valueBoolean?: boolean | null;
  unitOverride?: string | null;
  note?: string | null;
  sortOrder?: number;
};

function buildSaleCodeFromSlug(slug: string): string {
  const parts = slug.split("-").filter(Boolean);
  const firstLetters = parts.map((p) => p[0]?.toUpperCase() ?? "").join("");
  const prefix = firstLetters.slice(0, 5) || "PROD"; // VD: bang-tai-pvc -> BTPV

  const randomNumber = Math.floor(100000 + Math.random() * 900000); // 6 số
  return `AHSO-${prefix}-${randomNumber}`;
}

/**
 * GET /api/admin/products
 * List sản phẩm (có filter, paging) + có profitAmount / profitMargin
 */
export async function GET(req: NextRequest) {
  try {
    const me = await verifyBearerAuth(req);
    requireRole(me, ["ADMIN"]);

    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") || "";
    const brandId = searchParams.get("brandId") || undefined;
    const typeId = searchParams.get("typeId") || undefined;
    const sortByParam = searchParams.get("sortBy") || "updatedAt";
    const sortOrderParam: Prisma.SortOrder =
      searchParams.get("sortOrder") === "asc" ? "asc" : "desc";
    const status = searchParams.get("status") as z.infer<
      typeof PublishStatusEnum
    > | null;
    const { page, pageSize, skip, take } = parsePaging(req);

    const where: productWhereInput = {
      ...(q && {
        OR: [
          { name: { contains: q } },
          { sku: { contains: q } },
          { saleCode: { contains: q } },
          { brand: { name: { contains: q } } },
          { producttype: { name: { contains: q } } },
        ],
      }),
      ...(brandId && { brandId }),
      ...(typeId && { typeId }),
      ...(status && { status }),
    };

    let orderBy: Prisma.productOrderByWithRelationInput;
    switch (sortByParam) {
      case "name":
        orderBy = { name: sortOrderParam };
        break;
      case "sku":
        orderBy = { sku: sortOrderParam };
        break;
      case "brand":
        orderBy = { brand: { name: sortOrderParam } };
        break;
      case "type":
        orderBy = { producttype: { name: sortOrderParam } };
        break;
      default:
        orderBy = { updatedAt: sortOrderParam };
    }

    const [total, rows] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        orderBy,
        skip,
        take,
        select: {
          id: true,
          slug: true,
          name: true,
          sku: true,
          saleCode: true,
          supplierSku: true,
          supplierId: true,
          price: true,
          listPrice: true,
          costPrice: true,
          currency: true,
          coverImage: true,
          status: true,
          brandId: true,
          typeId: true,
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
          // 🔥 tiền lời
          profitAmount: true,
          profitMargin: true,
          createdAt: true,
          updatedAt: true,
          brand: { select: { id: true, name: true } },
          producttype: { select: { id: true, name: true } },
          supplier: { select: { id: true, name: true } },
        },
      }),
    ]);

    const data = rows.map(
      ({ producttype, supplier, ...rest }: (typeof rows)[number]) => ({
        ...rest,
        type: producttype,
        supplier,
      }),
    );

    return jsonOk({ data, meta: { total, page, pageSize } });
  } catch (error) {
    const err = toHttpError(error);
    return jsonError(err.message || "Internal Error", err.status || 500);
  }
}

/**
 * POST /api/admin/products
 * Tạo mới product:
 * - auto slug nếu trống
 * - auto saleCode AHSO-XXX-123456
 * - auto currency = VND
 * - auto taxIncluded = true
 * - tính profitAmount, profitMargin
 * - tạo productimage từ images[]
 * - tạo / upsert productspecdefinition + productspecvalue từ specs[]
 */

type CoreRaw = {
  price?: unknown;
  listPrice?: unknown;
  stockOnHand?: unknown;
  costPrice?: unknown;
  taxRate?: unknown;
  [key: string]: unknown;
};

type RawBody = {
  images?: unknown;
  specs?: unknown;
} & CoreRaw;

export async function POST(req: NextRequest) {
  try {
    const me = await verifyBearerAuth(req);
    requireRole(me, ["ADMIN"]);

    const rawBody = (await req.json()) as unknown;

    const { images = [], specs = [], ...restRaw } = rawBody as RawBody;

    const coreRaw = restRaw as CoreRaw;

    // Chuẩn hóa number từ string trước khi đưa cho Zod
    const parsed = ProductCreateSchema.safeParse({
      ...coreRaw,
      price:
        typeof coreRaw.price === "string"
          ? Number(coreRaw.price)
          : coreRaw.price,
      listPrice:
        typeof coreRaw.listPrice === "string"
          ? Number(coreRaw.listPrice)
          : coreRaw.listPrice,
      stockOnHand:
        typeof coreRaw.stockOnHand === "string"
          ? Number(coreRaw.stockOnHand)
          : coreRaw.stockOnHand,
      costPrice:
        typeof coreRaw.costPrice === "string"
          ? Number(coreRaw.costPrice)
          : coreRaw.costPrice,
      taxRate:
        typeof coreRaw.taxRate === "string"
          ? Number(coreRaw.taxRate)
          : coreRaw.taxRate,
    });

    if (!parsed.success) {
      return jsonError("Validation Error", 400, {
        issues: parsed.error.issues,
      });
    }

    const {
      name,
      sku,
      typeId,
      price,
      slug,
      description,
      coverImage,
      brandId,
      supplierId,
      supplierSku,
      listPrice,
      costPrice,
      stockOnHand,
      requiresQuote,
      quoteNote,
      taxRate,
      minOrderQty,
      stepQty,
      reorderLevel,
      reorderQty,
      status,
    } = parsed.data;

    // slug: nhập tay thì dùng, không thì sinh từ name
    const finalSlug = slug?.trim() || slugify(name);

    // gen saleCode từ slug
    const saleCode = buildSaleCodeFromSlug(finalSlug);

    // validate unique sku, slug
    const [dupSku, dupSlug] = await Promise.all([
      prisma.product.findUnique({ where: { sku } }),
      prisma.product.findUnique({ where: { slug: finalSlug } }),
    ]);

    if (dupSku) return jsonError("SKU already exists", 409);
    if (dupSlug) return jsonError("Slug already exists", 409);

    const [typeRow, brandRow] = await Promise.all([
      prisma.producttype.findUnique({ where: { id: typeId } }),
      brandId
        ? prisma.brand.findUnique({ where: { id: brandId } })
        : Promise.resolve(null),
    ]);
    if (!typeRow) return jsonError("typeId not found", 400);
    if (brandId && !brandRow) return jsonError("brandId not found", 400);

    // 🔥 Tính lời lãi
    const profitAmount =
      typeof costPrice === "number" ? price - costPrice : null;
    const profitMargin =
      typeof costPrice === "number" && costPrice > 0
        ? (profitAmount! / costPrice) * 100
        : null;

    const now = new Date();

    // Chuẩn hóa images/specs về đúng type (nếu FE gửi rác)
    const imageArray: ImageInput[] = Array.isArray(images)
      ? (images as ImageInput[])
      : [];

    const specArray: SpecInput[] = Array.isArray(specs)
      ? (specs as SpecInput[])
      : [];

    // Cover image: nếu không truyền, auto lấy ảnh đầu tiên trong images[]
    const finalCoverImage =
      coverImage && coverImage.trim().length > 0
        ? coverImage
        : imageArray[0]?.url ?? null;

    // SEO auto
    const metaTitle = `${name} | AHSO Industrial`;
    const metaDescription = (() => {
      const desc = (description ?? "").replace(/\s+/g, " ").trim();
      if (!desc) return undefined;
      if (desc.length <= 150) return desc;
      return `${desc.slice(0, 147)}...`;
    })();

    // Transaction: tạo product + images + specs
    const created = await prisma.$transaction(async (tx) => {
      // 1. Tạo product
      const product = await tx.product.create({
        data: {
          id: randomUUID(),
          name,
          sku,
          saleCode,
          typeId,
          price,
          slug: finalSlug,
          description: description ?? null,
          coverImage: finalCoverImage,
          brandId: brandId ?? null,
          supplierId: supplierId ?? null,
          supplierSku: supplierSku ?? null,
          listPrice: listPrice ?? null,
          costPrice: costPrice ?? null,
          stockOnHand: stockOnHand ?? 0,
          stockReserved: 0,
          currency: "VND", // cố định VND
          requiresQuote: requiresQuote ?? false,
          quoteNote: quoteNote ?? null,
          taxRate: taxRate ?? undefined, // schema accepts undefined, not null
          taxIncluded: true, // auto, không lấy từ body
          minOrderQty: minOrderQty ?? null,
          stepQty: stepQty ?? null,
          reorderLevel: reorderLevel ?? null,
          reorderQty: reorderQty ?? null,
          status: status ?? "DRAFT",
          ratingAvg: 0,
          ratingCount: 0,
          purchaseCount: 0,
          viewCount: 0,
          // 🔥 lưu lại tiền lời
          profitAmount,
          profitMargin,
          metaTitle,
          metaDescription,
          createdAt: now,
          updatedAt: now,
          publishAt: status === "PUBLISHED" ? now : null,
        },
      });

      // 2. Ảnh sản phẩm
      if (imageArray.length > 0) {
        for (const [idx, img] of imageArray.entries()) {
          await tx.productimage.create({
            data: {
              id: randomUUID(),
              productId: product.id,
              url: img.url,
              alt: img.alt ?? null,
              sortOrder: img.sortOrder ?? idx,
              createdAt: now,
              updatedAt: now,
            },
          });
        }
      }

      // 3. Thông số kỹ thuật (tạo definition nếu chưa có rồi gán value)
      if (specArray.length > 0) {
        for (const spec of specArray) {
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
              productId: product.id,
              specDefinitionId: def.id,
              valueString: spec.valueString ?? null,
              valueNumber:
                spec.valueNumber !== undefined ? spec.valueNumber : null,
              valueBoolean:
                spec.valueBoolean !== undefined ? spec.valueBoolean : null,
              unitOverride: spec.unitOverride ?? null,
              note: spec.note ?? null,
              sortOrder: spec.sortOrder ?? 0,
              createdAt: now,
              updatedAt: now,
            },
          });
        }
      }

      return product;
    });

    return jsonOk({ data: created }, 201);
  } catch (error) {
    const err = toHttpError(error);
    return jsonError(err.message || "Internal Error", err.status || 500);
  }
}
