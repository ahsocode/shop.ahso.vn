import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyBearerAuth, requireRole } from "@/lib/auth";
import { parsePaging, jsonOk, jsonError } from "@/lib/http";
import { slugify } from "@/lib/slug";
import { z } from "zod";

const SpecDefCreateSchema = z.object({
  name: z.string().min(1),
  slug: z.string().trim().optional(),
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

    const [total, data] = await Promise.all([
      prisma.productSpecDefinition.count({ where }),
      prisma.productSpecDefinition.findMany({
        where,
        orderBy: { name: "asc" },
        skip, take,
        select: { id: true, name: true, slug: true, createdAt: true, updatedAt: true },
      }),
    ]);

    return jsonOk({ data, meta: { total, page, pageSize } });
  } catch (e: any) {
    return jsonError(e.message || "Internal Error", e.status || 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const me = await verifyBearerAuth(req); requireRole(me, ["ADMIN"]);
    const body = await req.json();
    const parsed = SpecDefCreateSchema.safeParse(body);
    if (!parsed.success) return jsonError("Validation Error", 400, { issues: parsed.error.issues });

    const finalSlug = parsed.data.slug?.trim() || slugify(parsed.data.name);

    const dup = await prisma.productSpecDefinition.findUnique({ where: { slug: finalSlug } });
    if (dup) return jsonError("Slug already exists", 409);

    const created = await prisma.productSpecDefinition.create({
      data: { name: parsed.data.name, slug: finalSlug },
    });

    return jsonOk({ data: created }, 201);
  } catch (e: any) {
    return jsonError(e.message || "Internal Error", e.status || 500);
  }
}
