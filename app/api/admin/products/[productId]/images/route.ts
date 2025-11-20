import { randomUUID } from "crypto";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyBearerAuth, requireRole } from "@/lib/auth";
import { jsonOk, jsonError, toHttpError } from "@/lib/http";
import { z } from "zod";

const CreateImage = z.object({
  url: z.string().url(),
  alt: z.string().optional(),
  sortOrder: z.number().int().optional(),
});

export async function POST(req: NextRequest, ctx: { params: Promise<{ productId: string }> }) {
  try {
    const me = await verifyBearerAuth(req); 
    requireRole(me, ["ADMIN"]);
    const { productId } = await ctx.params;

    const body = await req.json();
    const parsed = CreateImage.safeParse(body);
    if (!parsed.success) return jsonError("Validation Error", 400, { issues: parsed.error.issues });

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) return jsonError("productId not found", 404);

    const now = new Date();

    const created = await prisma.$transaction(async (tx) => {
      const img = await tx.productimage.create({
        data: {
          id: randomUUID(),
          productId,
          url: parsed.data.url,
          alt: parsed.data.alt ?? null,
          sortOrder: parsed.data.sortOrder ?? 0,
          createdAt: now,
          updatedAt: now,
        },
      });

      // Nếu product chưa có coverImage, set luôn ảnh này làm cover
      if (!product.coverImage) {
        await tx.product.update({
          where: { id: productId },
          data: { coverImage: img.url, updatedAt: now },
        });
      }

      return img;
    });

    return jsonOk({ data: created }, 201);
  } catch (error) {
    const err = toHttpError(error);
    return jsonError(err.message || "Internal Error", err.status || 500);
  }
}
