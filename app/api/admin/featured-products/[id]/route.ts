import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyBearerAuth, requireRole } from "@/lib/auth";
import { jsonOk, jsonError, toHttpError } from "@/lib/http";

function getFeaturedModel() {
  const client = prisma as unknown as Record<string, unknown>;
  const lower = client["featuredproduct"] as
    | typeof prisma.featuredproduct
    | undefined;
  const camel = client["featuredProduct"] as
    | typeof prisma.featuredproduct
    | undefined;
  return lower ?? camel;
}

const FeaturedProductUpdateSchema = z.object({
  title: z.string().max(200).optional().nullable(),
  description: z.string().max(500).optional().nullable(),
  sortOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
  startDate: z.string().datetime().optional().nullable(),
  endDate: z.string().datetime().optional().nullable(),
});

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const me = await verifyBearerAuth(req);
    requireRole(me, ["ADMIN", "STAFF"]);
    const { id } = await ctx.params;

    const featuredModel = getFeaturedModel();
    if (!featuredModel) return jsonError("Feature model unavailable", 500);

    const row = await featuredModel.findUnique({
      where: { id },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            sku: true,
            saleCode: true,
            price: true,
            coverImage: true,
            status: true,
            brand: { select: { name: true } },
          },
        },
      },
    });

    if (!row) return jsonError("Not Found", 404);

    const { product, ...rest } = row;
    return jsonOk({
      data: {
        ...rest,
        product: {
          ...product,
          brandName: product.brand?.name ?? null,
        },
      },
    });
  } catch (error) {
    const err = toHttpError(error);
    return jsonError(err.message || "Internal Error", err.status || 500);
  }
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const me = await verifyBearerAuth(req);
    requireRole(me, ["ADMIN"]);
    const { id } = await ctx.params;

    const body = await req.json();
    const parsed = FeaturedProductUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError("Validation Error", 400, { issues: parsed.error.issues });
    }

    const featuredModel = getFeaturedModel();
    if (!featuredModel) return jsonError("Feature model unavailable", 500);

    const existing = await featuredModel.findUnique({ where: { id } });
    if (!existing) return jsonError("Not Found", 404);

    const data = parsed.data;
    const updated = await featuredModel.update({
      where: { id },
      data: {
        title: data.title !== undefined ? data.title : undefined,
        description: data.description !== undefined ? data.description : undefined,
        sortOrder: data.sortOrder,
        isActive: data.isActive,
        startDate: data.startDate !== undefined ? (data.startDate ? new Date(data.startDate) : null) : undefined,
        endDate: data.endDate !== undefined ? (data.endDate ? new Date(data.endDate) : null) : undefined,
        updatedAt: new Date(),
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            sku: true,
            price: true,
            coverImage: true,
          },
        },
      },
    });

    await prisma.product.update({
      where: { id: updated.productId },
      data: { isFeatured: Boolean(updated.isActive) },
    });

    return jsonOk({ data: updated });
  } catch (error) {
    const err = toHttpError(error);
    return jsonError(err.message || "Internal Error", err.status || 500);
  }
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const me = await verifyBearerAuth(req);
    requireRole(me, ["ADMIN"]);
    const { id } = await ctx.params;

    const featuredModel = getFeaturedModel();
    if (!featuredModel) return jsonError("Feature model unavailable", 500);

    const existing = await featuredModel.findUnique({
      where: { id },
      select: { productId: true },
    });
    if (!existing) return jsonError("Not Found", 404);

    await featuredModel.delete({ where: { id } });
    await prisma.product.update({
      where: { id: existing.productId },
      data: { isFeatured: false },
    });
    return jsonOk({ ok: true });
  } catch (error) {
    const err = toHttpError(error);
    return jsonError(err.message || "Internal Error", err.status || 500);
  }
}
