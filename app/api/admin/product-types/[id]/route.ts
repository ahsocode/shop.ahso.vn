import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyBearerAuth, requireRole } from "@/lib/auth";
import { jsonOk, jsonError, toHttpError } from "@/lib/http";
import { slugify } from "@/lib/slug";
import { z } from "zod";

const UpdateSchema = z.object({
  name: z.string().min(1).optional(),
  slug: z.string().trim().optional(),
  coverImage: z.string().url().optional(),
  description: z.string().optional(),
  categoryId: z.string().uuid().optional(), // cho phép chuyển category nếu muốn
});

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const me = await verifyBearerAuth(req); requireRole(me, ["ADMIN"]);
    const { id } = await ctx.params;

    const row = await prisma.producttype.findUnique({
      where: { id },
      include: { productcategory: { select: { id: true, name: true, slug: true } } },
    });
    if (!row) return jsonError("Not Found", 404);
    const { productcategory, ...rest } = row;
    return jsonOk({ data: { ...rest, category: productcategory } });
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
    const parsed = UpdateSchema.safeParse(body);
    if (!parsed.success) return jsonError("Validation Error", 400, { issues: parsed.error.issues });

    const current = await prisma.producttype.findUnique({ where: { id } });
    if (!current) return jsonError("Not Found", 404);

    const updates = parsed.data;
    const hasSlugField = Object.prototype.hasOwnProperty.call(updates, "slug");
    const explicitSlug = hasSlugField ? (updates.slug ?? "").trim() : undefined;
    let slugChange: string | undefined;

    if (explicitSlug && explicitSlug !== current.slug) {
      slugChange = explicitSlug;
    } else {
      let baseName: string | undefined;
      if (typeof updates.name === "string") {
        baseName = updates.name;
      } else if (hasSlugField && !explicitSlug) {
        baseName = current.name;
      }
      if (baseName) {
        const auto = slugify(baseName);
        if (auto && auto !== current.slug) slugChange = auto;
      }
    }

    // Nếu đổi category hoặc slug, cần đảm bảo unique compound (categoryId, slug)
    const nextCategoryId = updates.categoryId ?? current.categoryId;
    const nextSlug = slugChange ?? current.slug;

    if ((slugChange && nextSlug !== current.slug) || nextCategoryId !== current.categoryId) {
      const dup = await prisma.producttype.findUnique({
        where: { categoryId_slug: { categoryId: nextCategoryId, slug: nextSlug } },
      });
      if (dup && dup.id !== id) return jsonError("Slug already exists in this category", 409);
    }

    // Nếu người dùng truyền categoryId mới, validate tồn tại
    if (parsed.data.categoryId) {
      const cat = await prisma.productcategory.findUnique({ where: { id: parsed.data.categoryId } });
      if (!cat) return jsonError("categoryId not found", 400);
    }

    const updated = await prisma.producttype.update({
      where: { id },
      data: {
        ...updates,
        // đảm bảo ghi đúng cặp unique
        ...((slugChange && slugChange.length) || typeof updates.categoryId !== "undefined"
          ? { slug: nextSlug, categoryId: nextCategoryId }
          : {}),
      },
    });

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

    await prisma.producttype.delete({ where: { id } });
    return jsonOk({ ok: true });
  } catch (error) {
    const err = toHttpError(error);
    if (err.code === "P2003") {
      return jsonError(
        "Không thể xóa loại sản phẩm vì vẫn còn sản phẩm thuộc loại này.",
        409,
      );
    }
    return jsonError(err.message || "Internal Error", err.status || 500);
  }
}
