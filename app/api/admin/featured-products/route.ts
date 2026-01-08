import { randomUUID } from "crypto";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyBearerAuth, requireRole } from "@/lib/auth";
import { jsonOk, jsonError, toHttpError, parsePaging } from "@/lib/http";

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

const FeaturedProductCreateSchema = z.object({
  productId: z.string().uuid(),
  title: z.string().max(200).optional().nullable(),
  description: z.string().max(500).optional().nullable(),
  sortOrder: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
  startDate: z.string().datetime().optional().nullable(),
  endDate: z.string().datetime().optional().nullable(),
});

export async function GET(req: NextRequest) {
  try {
    const me = await verifyBearerAuth(req);
    requireRole(me, ["ADMIN", "STAFF"]);

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status"); // "active", "inactive", "all"
    const { page, pageSize, skip, take } = parsePaging(req, { defaultPageSize: 20 });

    const where = {
      ...(status === "active" && { isActive: true }),
      ...(status === "inactive" && { isActive: false }),
    };

    const model = getFeaturedModel();
    if (!model) {
      console.error("Featured product model not found on Prisma client");
      return jsonOk({ data: [], meta: { total: 0, page, pageSize } });
    }

    const [total, rows] = await Promise.all([
      model.count({ where }),
      model.findMany({
        where,
        orderBy: { sortOrder: "asc" },
        skip,
        take,
        select: {
          id: true,
          productId: true,
          title: true,
          description: true,
          sortOrder: true,
          isActive: true,
          startDate: true,
          endDate: true,
          createdAt: true,
          updatedAt: true,
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
              brand: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      }),
    ]);

    const data = rows.map((row) => {
      const { product, ...rest } = row;
      return {
        ...rest,
        product: {
          ...product,
          brandName: product.brand?.name ?? null,
        },
      };
    });

    return jsonOk({ data, meta: { total, page, pageSize } });
  } catch (error) {
    const err = toHttpError(error);
    return jsonError(err.message || "Internal Error", err.status || 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const me = await verifyBearerAuth(req);
    requireRole(me, ["ADMIN"]);

    const body = await req.json();
    const parsed = FeaturedProductCreateSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError("Validation Error", 400, { issues: parsed.error.issues });
    }

    const { productId, title, description, sortOrder, isActive, startDate, endDate } = parsed.data;

    // Check if product exists
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, name: true },
    });
    if (!product) {
      return jsonError("Product not found", 404);
    }

    // Check if already featured
    const featuredModel = getFeaturedModel();
    if (!featuredModel) return jsonError("Featured product model unavailable", 500);

    const existing = await featuredModel.findUnique({
      where: { productId },
    });
    if (existing) {
      return jsonError("Product is already featured", 409);
    }

    const now = new Date();
    const created = await featuredModel.create({
      data: {
        id: randomUUID(),
        productId,
        title: title ?? null,
        description: description ?? null,
        sortOrder,
        isActive,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        createdAt: now,
        updatedAt: now,
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
      where: { id: productId },
      data: { isFeatured: Boolean(isActive) },
    });

    return jsonOk({ data: created }, 201);
  } catch (error) {
    const err = toHttpError(error);
    return jsonError(err.message || "Internal Error", err.status || 500);
  }
}
