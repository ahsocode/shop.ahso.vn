import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyBearerAuth, requireRole } from "@/lib/auth";
import { jsonOk, jsonError, toHttpError } from "@/lib/http";
import { z } from "zod";

const UpdateSchema = z.object({
  name: z.string().min(1).optional(),
  slug: z.string().trim().optional(),
  coverImage: z.string().url().optional(),
  description: z.string().optional(),
  categoryId: z.string().cuid().optional(), // cho phép chuyển category nếu muốn
});

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const me = await verifyBearerAuth(req); requireRole(me, ["ADMIN"]);
    const { id } = await ctx.params;

    const row = await prisma.productType.findUnique({
      where: { id },
      include: { category: { select: { id: true, name: true, slug: true } } },
    });
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
    const parsed = UpdateSchema.safeParse(body);
    if (!parsed.success) return jsonError("Validation Error", 400, { issues: parsed.error.issues });

    const current = await prisma.productType.findUnique({ where: { id } });
    if (!current) return jsonError("Not Found", 404);

    // Nếu đổi category hoặc slug, cần đảm bảo unique compound (categoryId, slug)
    const nextCategoryId = parsed.data.categoryId ?? current.categoryId;
    const nextSlug = parsed.data.slug ?? current.slug;

    if (nextSlug !== current.slug || nextCategoryId !== current.categoryId) {
      const dup = await prisma.productType.findUnique({
        where: { categoryId_slug: { categoryId: nextCategoryId, slug: nextSlug } },
      });
      if (dup && dup.id !== id) return jsonError("Slug already exists in this category", 409);
    }

    // Nếu người dùng truyền categoryId mới, validate tồn tại
    if (parsed.data.categoryId) {
      const cat = await prisma.productCategory.findUnique({ where: { id: parsed.data.categoryId } });
      if (!cat) return jsonError("categoryId not found", 400);
    }

    const updated = await prisma.productType.update({
      where: { id },
      data: {
        ...parsed.data,
        // đảm bảo ghi đúng cặp unique
        ...(parsed.data.slug || parsed.data.categoryId ? { slug: nextSlug, categoryId: nextCategoryId } : {}),
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

    await prisma.productType.delete({ where: { id } });
    return jsonOk({ ok: true });
  } catch (error) {
    const err = toHttpError(error);
    if (err.code === "P2003") return jsonError("Cannot delete: product type in use", 409);
    return jsonError(err.message || "Internal Error", err.status || 500);
  }
}
