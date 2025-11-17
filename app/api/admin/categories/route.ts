import { randomUUID } from "crypto";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyBearerAuth, requireRole } from "@/lib/auth";
import { parsePaging, jsonOk, jsonError, toHttpError } from "@/lib/http";
import { slugify } from "@/lib/slug";
import { z } from "zod";

const CategoryCreateSchema = z.object({
  name: z.string().min(1),
  slug: z.string().trim().optional(),
  coverImage: z.string().url().optional(),
  description: z.string().optional().nullable(),
});

export async function GET(req: NextRequest) {
  try {
    const me = await verifyBearerAuth(req); requireRole(me, ["ADMIN"]);
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") || "";
    const { page, pageSize, skip, take } = parsePaging(req);

    const where = q
      ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { slug: { contains: q, mode: "insensitive" } }] }
      : {};

    const [total, rows] = await Promise.all([
      prisma.productcategory.count({ where }),
      prisma.productcategory.findMany({
        where,
        orderBy: { name: "asc" },
        skip,
        take,
        select: {
          id: true,
          slug: true,
          name: true,
          coverImage: true,
          description: true,
          createdAt: true,
          updatedAt: true,
          _count: { select: { productcategorylink: true } },
        },
      }),
    ]);

    const data = rows.map(({ _count, ...rest }) => ({
      ...rest,
      productCount: _count.productcategorylink,
    }));

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
    const parsed = CategoryCreateSchema.safeParse(body);
    if (!parsed.success) return jsonError("Validation Error", 400, { issues: parsed.error.issues });

    const { name, slug, coverImage, description } = parsed.data;
    const finalSlug = slug?.trim() || slugify(name);

    const dup = await prisma.productcategory.findUnique({ where: { slug: finalSlug } });
    if (dup) return jsonError("Slug already exists", 409);

    const now = new Date();
    const created = await prisma.productcategory.create({
      data: {
        id: randomUUID(),
        name,
        slug: finalSlug,
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
