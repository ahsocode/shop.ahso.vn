import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyBearerAuth, requireRole } from "@/lib/auth";
import { jsonOk, jsonError, toHttpError } from "@/lib/http";
import { ProductUpdateSchema } from "@/lib/validators";
import { slugify } from "@/lib/slug";
import type { productGetPayload, productUpdateInput } from "@/lib/prisma-types";

const productSelect = {
  id: true,
  slug: true,
  name: true,
  sku: true,
  description: true,
  coverImage: true,
  price: true,
  listPrice: true,
  currency: true,
  status: true,
  brandId: true,
  typeId: true,
  stockOnHand: true,
  stockReserved: true,
  createdAt: true,
  updatedAt: true,
  brand: { select: { id: true, name: true } },
  producttype: { select: { id: true, name: true } },
} as const;

type AdminProductRow = productGetPayload<{ select: typeof productSelect }>;

const mapProduct = (row: AdminProductRow | null) => {
  if (!row) return row;
  const { producttype, ...rest } = row;
  return { ...rest, type: producttype };
};

function normalizePayload(body: unknown) {
  const source: Record<string, unknown> =
    typeof body === "object" && body ? { ...(body as Record<string, unknown>) } : {};
  if (typeof source.price === "string") source.price = Number(source.price);
  if (typeof source.listPrice === "string") source.listPrice = source.listPrice ? Number(source.listPrice) : undefined;
  if (typeof source.stockOnHand === "string") source.stockOnHand = Number(source.stockOnHand);
  return source;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ productId: string }> }) {
  try {
    const { productId } = await params;
    const me = await verifyBearerAuth(_req);
    requireRole(me, ["ADMIN"]);
    const product = await prisma.product.findUnique({ where: { id: productId }, select: productSelect });
    if (!product) return jsonError("Not found", 404);
    return jsonOk({ data: mapProduct(product) });
  } catch (error) {
    const err = toHttpError(error);
    return jsonError(err.message || "Internal Error", err.status || 500);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ productId: string }> }) {
  try {
    const { productId } = await params;
    const me = await verifyBearerAuth(req);
    requireRole(me, ["ADMIN"]);
    const body = normalizePayload(await req.json());
    const parsed = ProductUpdateSchema.safeParse(body);
    if (!parsed.success) return jsonError("Validation Error", 400, { issues: parsed.error.issues });

    const data = parsed.data;
    if ("slug" in data && data.slug) data.slug = data.slug.trim();
    const updates: productUpdateInput = { ...data };

    if (data.slug) {
      const slugTaken = await prisma.product.findFirst({ where: { slug: data.slug, NOT: { id: productId } }, select: { id: true } });
      if (slugTaken) return jsonError("Slug already exists", 409);
    } else if ("slug" in data && !data.slug) {
      updates.slug = slugify(data.name ?? "");
    }

    if (data.sku) {
      const skuTaken = await prisma.product.findFirst({ where: { sku: data.sku, NOT: { id: productId } }, select: { id: true } });
      if (skuTaken) return jsonError("SKU already exists", 409);
    }

    if (data.typeId) {
      const typeRow = await prisma.producttype.findUnique({ where: { id: data.typeId } });
      if (!typeRow) return jsonError("typeId not found", 400);
    }

    if (data.brandId) {
      const brandRow = await prisma.brand.findUnique({ where: { id: data.brandId } });
      if (!brandRow) return jsonError("brandId not found", 400);
    }

    const updated = await prisma.product.update({
      where: { id: productId },
      data: updates,
      select: productSelect,
    });

    return jsonOk({ data: mapProduct(updated) });
  } catch (error) {
    const err = toHttpError(error);
    return jsonError(err.message || "Internal Error", err.status || 500);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ productId: string }> }) {
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
