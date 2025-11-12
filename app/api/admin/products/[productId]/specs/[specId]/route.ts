import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyBearerAuth, requireRole } from "@/lib/auth";
import { jsonOk, jsonError } from "@/lib/http";
import { ProductSpecUpdateSchema } from "@/lib/validators";
// import { z } from "zod";
// const ProductSpecUpdateSchema = z.object({
//   valueString: z.string().optional(),
//   valueNumber: z.number().optional(),
//   valueBoolean: z.boolean().optional(),
//   unitOverride: z.string().optional(),
//   note: z.string().optional(),
//   sortOrder: z.number().int().optional(),
// });

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ productId: string; specId: string }> }
) {
  try {
    const me = await verifyBearerAuth(req); requireRole(me, ["ADMIN"]);
    const { productId, specId } = await ctx.params;

    const spec = await prisma.productSpecValue.findUnique({ where: { id: specId } });
    if (!spec || spec.productId !== productId) return jsonError("Not Found", 404);

    const body = await req.json();
    const parsed = ProductSpecUpdateSchema.safeParse(body);
    if (!parsed.success) return jsonError("Validation Error", 400, { issues: parsed.error.issues });

    const updated = await prisma.productSpecValue.update({
      where: { id: specId },
      data: parsed.data,
    });
    return jsonOk({ data: updated });
  } catch (e: any) {
    return jsonError(e.message || "Internal Error", e.status || 500);
  }
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ productId: string; specId: string }> }
) {
  try {
    const me = await verifyBearerAuth(req); requireRole(me, ["ADMIN"]);
    const { productId, specId } = await ctx.params;

    const spec = await prisma.productSpecValue.findUnique({ where: { id: specId } });
    if (!spec || spec.productId !== productId) return jsonError("Not Found", 404);

    await prisma.productSpecValue.delete({ where: { id: specId } });
    return jsonOk({ ok: true });
  } catch (e: any) {
    return jsonError(e.message || "Internal Error", e.status || 500);
  }
}
