import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyBearerAuth, requireRole } from "@/lib/auth";
import { jsonOk, jsonError, toHttpError } from "@/lib/http";
import { z } from "zod";

const UpdateImage = z.object({
  url: z.string().url().optional(),
  alt: z.string().optional(),
  sortOrder: z.number().int().optional(),
});

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ productId: string; imageId: string }> }
) {
  try {
    const me = await verifyBearerAuth(req); requireRole(me, ["ADMIN"]);
    const { productId, imageId } = await ctx.params;

    const img = await prisma.productImage.findUnique({ where: { id: imageId } });
    if (!img || img.productId !== productId) return jsonError("Not Found", 404);

    const body = await req.json();
    const parsed = UpdateImage.safeParse(body);
    if (!parsed.success) return jsonError("Validation Error", 400, { issues: parsed.error.issues });

    const updated = await prisma.productImage.update({
      where: { id: imageId },
      data: parsed.data,
    });

    return jsonOk({ data: updated });
  } catch (error) {
    const err = toHttpError(error);
    return jsonError(err.message || "Internal Error", err.status || 500);
  }
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ productId: string; imageId: string }> }
) {
  try {
    const me = await verifyBearerAuth(req); requireRole(me, ["ADMIN"]);
    const { productId, imageId } = await ctx.params;

    const img = await prisma.productImage.findUnique({ where: { id: imageId } });
    if (!img || img.productId !== productId) return jsonError("Not Found", 404);

    await prisma.productImage.delete({ where: { id: imageId } });
    return jsonOk({ ok: true });
  } catch (error) {
    const err = toHttpError(error);
    return jsonError(err.message || "Internal Error", err.status || 500);
  }
}
