import { randomUUID } from "crypto";
import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { verifyBearerAuth, requireRole } from "@/lib/auth";
import { parsePaging, jsonOk, jsonError, toHttpError } from "@/lib/http";
import { slugify } from "@/lib/slug";
import { z } from "zod";

const ProductTypeCreateSchema = z.object({
  name: z.string().min(1),
  slug: z.string().trim().optional(),
  categoryId: z.string().min(1),
  coverImage: z.string().url().optional(),
  description: z.string().optional().nullable(),
});

export async function GET(req: NextRequest) {
  try {
    const me = await verifyBearerAuth(req); requireRole(me, ["ADMIN"]);
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") || "";
    const categoryId = searchParams.get("categoryId") || undefined;
    const { page, pageSize, skip, take } = parsePaging(req);

    const where: Prisma.producttypeWhereInput = {};
    if (q) where.OR = [{ name: { contains: q } }, { slug: { contains: q } }];
    if (categoryId) where.categoryId = categoryId;

    const [total, rows] = await Promise.all([
      prisma.producttype.count({ where }),
      prisma.producttype.findMany({
        where,
        orderBy: { name: "asc" },
        skip, take,
        select: {
          id: true,
          slug: true,
          name: true,
          categoryId: true,
          coverImage: true,
          description: true,
          createdAt: true,
          updatedAt: true,
          productcategory: { select: { name: true } },
          _count: { select: { product: true } },
        },
      }),
    ]);

  
type ProductTypeRow = (typeof rows)[number];

const mapped = rows.map((row: ProductTypeRow) => {
  const { productcategory, _count, ...rest } = row;
  return {
    ...rest,
    categoryName: productcategory?.name ?? "",
    productCount: _count.product,
  };
});

    return jsonOk({ data: mapped, meta: { total, page, pageSize } });
  } catch (error) {
    const err = toHttpError(error);
    return jsonError(err.message || "Internal Error", err.status || 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const me = await verifyBearerAuth(req); requireRole(me, ["ADMIN"]);
    const body = await req.json();
    const parsed = ProductTypeCreateSchema.safeParse(body);
    if (!parsed.success) return jsonError("Validation Error", 400, { issues: parsed.error.issues });

    const { name, slug, categoryId, coverImage, description } = parsed.data;
    const finalSlug = (slug?.trim() || slugify(name));

    // 1) check category tồn tại
    const cate = await prisma.productcategory.findUnique({ where: { id: categoryId } });
    if (!cate) return jsonError("categoryId not found", 400);

    // 2) check unique compound (categoryId + slug)
    const dup = await prisma.producttype.findUnique({
      where: { categoryId_slug: { categoryId, slug: finalSlug } },
    });
    if (dup) return jsonError("Slug already exists in this category", 409);

    const now = new Date();
    const created = await prisma.producttype.create({
      data: {
        id: randomUUID(),
        name,
        slug: finalSlug,
        categoryId,
        coverImage: coverImage ?? null,
        description: description ?? null,
        createdAt: now,
        updatedAt: now,
      },
    });

    return jsonOk({ data: created }, 201);
  } catch (error) {
    const err = toHttpError(error);
    return jsonError(err.message || "Internal Error", err.status || 500);
  }
}
