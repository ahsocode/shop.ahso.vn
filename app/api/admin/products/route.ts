import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyBearerAuth, requireRole } from "@/lib/auth";
import { parsePaging, jsonOk, jsonError, toHttpError } from "@/lib/http";
import { slugify } from "@/lib/slug";
import { ProductCreateSchema, PublishStatusEnum } from "@/lib/validators";

export async function GET(req: NextRequest) {
  try {
    const me = await verifyBearerAuth(req); requireRole(me, ["ADMIN"]);
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") || "";
    const brandId = searchParams.get("brandId") || undefined;
    const typeId = searchParams.get("typeId") || undefined;
    const status = searchParams.get("status") as z.infer<typeof PublishStatusEnum> | null;
    const { page, pageSize, skip, take } = parsePaging(req);

    const where: Prisma.ProductWhereInput = {};
    if (q) where.OR = [{ name: { contains: q } }, { sku: { contains: q } }];
    if (brandId) where.brandId = brandId;
    if (typeId) where.typeId = typeId;
    if (status) where.status = status;

    const [total, data] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where, orderBy: { createdAt: "desc" }, skip, take,
        select: {
          id: true, slug: true, name: true, sku: true, price: true, listPrice: true,
          coverImage: true, status: true, brandId: true, typeId: true, stockOnHand: true,
        },
      }),
    ]);

    return jsonOk({ data, meta: { total, page, pageSize } });
  } catch (error) {
    const err = toHttpError(error);
    return jsonError(err.message || "Internal Error", err.status || 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const me = await verifyBearerAuth(req); requireRole(me, ["ADMIN"]);
    const body = await req.json();

    const parsed = ProductCreateSchema.safeParse({
      ...body,
      price: typeof body.price === "string" ? Number(body.price) : body.price,
      listPrice: typeof body.listPrice === "string" ? Number(body.listPrice) : body.listPrice,
      stockOnHand: typeof body.stockOnHand === "string" ? Number(body.stockOnHand) : body.stockOnHand,
    });
    if (!parsed.success) return jsonError("Validation Error", 400, { issues: parsed.error.issues });

    const { name, sku, typeId, price, slug, description, coverImage, brandId, listPrice, stockOnHand, status } = parsed.data;
    const finalSlug = slug?.trim() || slugify(name);

    const dupSku = await prisma.product.findUnique({ where: { sku } });
    if (dupSku) return jsonError("SKU already exists", 409);
    const dupSlug = await prisma.product.findUnique({ where: { slug: finalSlug } });
    if (dupSlug) return jsonError("Slug already exists", 409);

    const [typeRow, brandRow] = await Promise.all([
      prisma.productType.findUnique({ where: { id: typeId } }),
      brandId ? prisma.brand.findUnique({ where: { id: brandId } }) : Promise.resolve(null),
    ]);
    if (!typeRow) return jsonError("typeId not found", 400);
    if (brandId && !brandRow) return jsonError("brandId not found", 400);

    const created = await prisma.product.create({
      data: {
        name, sku, typeId, price,
        slug: finalSlug,
        description: description ?? null,
        coverImage: coverImage ?? null,
        brandId: brandId ?? null,
        listPrice: listPrice ?? null,
        stockOnHand: stockOnHand ?? 0,
        status: status ?? "DRAFT",
      },
    });
    return jsonOk({ data: created }, 201);
  } catch (error) {
    const err = toHttpError(error);
    return jsonError(err.message || "Internal Error", err.status || 500);
  }
}
