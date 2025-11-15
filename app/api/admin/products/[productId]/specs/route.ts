import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyBearerAuth, requireRole } from "@/lib/auth";
import { jsonOk, jsonError, toHttpError } from "@/lib/http";
// Nếu bạn có Zod riêng thì giữ nguyên import dưới, còn không dùng tạm inline schema
import { ProductSpecCreateSchema } from "@/lib/validators";
// import { z } from "zod";
// const ProductSpecCreateSchema = z.object({
//   specDefinitionId: z.string().min(1),
//   valueString: z.string().optional(),
//   valueNumber: z.number().optional(),
//   valueBoolean: z.boolean().optional(),
//   unitOverride: z.string().optional(),
//   note: z.string().optional(),
//   sortOrder: z.number().int().optional(),
// });

export async function POST(req: NextRequest, ctx: { params: Promise<{ productId: string }> }) {
  try {
    const me = await verifyBearerAuth(req); requireRole(me, ["ADMIN"]);
    const { productId } = await ctx.params;

    const body = await req.json();
    const parsed = ProductSpecCreateSchema.safeParse(body);
    if (!parsed.success) return jsonError("Validation Error", 400, { issues: parsed.error.issues });

    const [product, def] = await Promise.all([
      prisma.product.findUnique({ where: { id: productId } }),
      prisma.productSpecDefinition.findUnique({ where: { id: parsed.data.specDefinitionId } }),
    ]);
    if (!product) return jsonError("productId not found", 404);
    if (!def) return jsonError("specDefinitionId not found", 400);

    const created = await prisma.productSpecValue.create({
      data: { productId, ...parsed.data },
    });
    return jsonOk({ data: created }, 201);
  } catch (error) {
    const err = toHttpError(error);
    return jsonError(err.message || "Internal Error", err.status || 500);
  }
}
