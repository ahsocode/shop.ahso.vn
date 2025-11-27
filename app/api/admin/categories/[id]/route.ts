import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyBearerAuth, requireRole } from "@/lib/auth";
import { jsonOk, jsonError, toHttpError } from "@/lib/http";
import { slugify } from "@/lib/slug";
import { z } from "zod";

const CategoryUpdate = z.object({
  name: z.string().min(1).optional(),
  slug: z.string().trim().optional(),
  coverImage: z.string().url().optional(),
  description: z.string().optional(),
});

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const me = await verifyBearerAuth(req); requireRole(me, ["ADMIN"]);
    const { id } = await ctx.params;

    const row = await prisma.productcategory.findUnique({ where: { id } });
    if (!row) return jsonError("Not Found", 404);
    return jsonOk({ data: row });
  } catch (error) {
    const err = toHttpError(error);
    return jsonError(err.message || "Internal Error", err.status || 500);
  }
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const me = await verifyBearerAuth(req); requireRole(me, ["ADMIN"]);
    const { id } = await ctx.params;

    const body = await req.json();
    const parsed = CategoryUpdate.safeParse(body);
    if (!parsed.success) return jsonError("Validation Error", 400, { issues: parsed.error.issues });

    const current = await prisma.productcategory.findUnique({ where: { id } });
    if (!current) return jsonError("Not Found", 404);

    const updates = parsed.data;
    const hasSlugField = Object.prototype.hasOwnProperty.call(updates, "slug");
    const explicitSlug = hasSlugField ? (updates.slug ?? "").trim() : undefined;
    let slugCandidate: string | undefined;

    if (explicitSlug && explicitSlug !== current.slug) {
      slugCandidate = explicitSlug;
    } else {
      let baseName: string | undefined;
      if (typeof updates.name === "string") {
        baseName = updates.name;
      } else if (hasSlugField && !explicitSlug) {
        baseName = current.name;
      }
      if (baseName) {
        const auto = slugify(baseName);
        if (auto && auto !== current.slug) slugCandidate = auto;
      }
    }

    if (slugCandidate && slugCandidate !== current.slug) {
      const dup = await prisma.productcategory.findUnique({ where: { slug: slugCandidate } });
      if (dup) return jsonError("Slug already exists", 409);
      updates.slug = slugCandidate;
    }

    const updated = await prisma.productcategory.update({ where: { id }, data: updates });
    return jsonOk({ data: updated });
  } catch (error) {
    const err = toHttpError(error);
    return jsonError(err.message || "Internal Error", err.status || 500);
  }
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const me = await verifyBearerAuth(req); requireRole(me, ["ADMIN"]);
    const { id } = await ctx.params;

    await prisma.productcategory.delete({ where: { id } });
    return jsonOk({ ok: true });
  } catch (error) {
    const err = toHttpError(error);
    if (err.code === "P2003") {
      return jsonError(
        "Không thể xóa danh mục vì còn loại sản phẩm đang gắn với danh mục này.",
        409,
      );
    }
    return jsonError(err.message || "Internal Error", err.status || 500);
  }
}
