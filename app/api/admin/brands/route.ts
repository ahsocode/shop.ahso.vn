import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyBearerAuth, requireRole } from "@/lib/auth";
import { parsePaging, jsonOk, jsonError } from "@/lib/http";
import { slugify } from "@/lib/slug";
import { BrandCreateSchema } from "@/lib/validators";

export async function GET(req: NextRequest) {
  try {
    const me = await verifyBearerAuth(req); requireRole(me, ["ADMIN"]);
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") || "";
    const { page, pageSize, skip, take } = parsePaging(req);

    const where = q
      ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { slug: { contains: q, mode: "insensitive" } }] }
      : {};

    const [total, data] = await Promise.all([
      prisma.brand.count({ where }),
      prisma.brand.findMany({
        where, orderBy: { name: "asc" }, skip, take,
        select: { id: true, slug: true, name: true, logoUrl: true, summary: true, productCount: true },
      }),
    ]);
    return jsonOk({ data, meta: { total, page, pageSize } });
  } catch (e: any) { return jsonError(e.message || "Internal Error", e.status || 500); }
}

export async function POST(req: NextRequest) {
  try {
    const me = await verifyBearerAuth(req); requireRole(me, ["ADMIN"]);
    const body = await req.json();
    const parsed = BrandCreateSchema.safeParse(body);
    if (!parsed.success) return jsonError("Validation Error", 400, { issues: parsed.error.issues });

    const { name, slug, logoUrl, summary } = parsed.data;
    const finalSlug = slug?.trim() || slugify(name);

    const exists = await prisma.brand.findUnique({ where: { slug: finalSlug } });
    if (exists) return jsonError("Slug already exists", 409);

    const created = await prisma.brand.create({
      data: { name, slug: finalSlug, logoUrl: logoUrl ?? null, summary: summary ?? null },
    });
    return jsonOk({ data: created }, 201);
  } catch (e: any) { return jsonError(e.message || "Internal Error", e.status || 500); }
}
