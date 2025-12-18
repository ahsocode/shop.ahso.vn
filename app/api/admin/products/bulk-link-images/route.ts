import { randomUUID } from "crypto";
import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyBearerAuth, requireRole } from "@/lib/auth";
import { jsonOk, jsonError, toHttpError } from "@/lib/http";

const BodySchema = z.object({
  productIds: z.array(z.string().trim().min(1)).min(1),
  images: z
    .array(
      z.object({
        url: z.string().url(),
        alt: z.string().optional(),
      }),
    )
    .min(1),
  coverUrl: z.string().url().optional(),
  coverMode: z.enum(["missing", "overwrite"]).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const me = await verifyBearerAuth(req);
    requireRole(me, ["ADMIN"]);

    const body = await req.json();
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      return jsonError("Validation Error", 400, { issues: parsed.error.issues });
    }

    const { productIds, images, coverUrl, coverMode } = parsed.data;
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: {
        id: true,
        coverImage: true,
      },
    });

    if (!products.length) {
      return jsonError("Không tìm thấy sản phẩm phù hợp", 404);
    }

    const now = new Date();
    let linked = 0;
    const duplicateSkips: Record<string, number> = {};

    for (const product of products) {
      const existingImages = await prisma.productimage.findMany({
        where: { productId: product.id },
        select: { url: true, sortOrder: true },
        orderBy: { sortOrder: "desc" },
      });
      const existingUrls = new Set(existingImages.map((img) => img.url));
      let nextSort = existingImages[0]?.sortOrder ?? 0;
      const rowsToCreate: {
        id: string;
        productId: string;
        url: string;
        alt: string | null;
        sortOrder: number;
        createdAt: Date;
        updatedAt: Date;
      }[] = [];

      for (const img of images) {
        if (existingUrls.has(img.url)) {
          duplicateSkips[product.id] = (duplicateSkips[product.id] ?? 0) + 1;
          continue;
        }
        nextSort += 1;
        rowsToCreate.push({
          id: randomUUID(),
          productId: product.id,
          url: img.url,
          alt: img.alt ?? null,
          sortOrder: nextSort,
          createdAt: now,
          updatedAt: now,
        });
      }

      if (!rowsToCreate.length) continue;

      await prisma.$transaction(async (tx) => {
        await tx.productimage.createMany({
          data: rowsToCreate,
          skipDuplicates: true,
        });
        const coverCandidate = coverUrl ?? rowsToCreate[0]?.url ?? null;
        const shouldOverwrite = coverMode === "overwrite";
        if (coverCandidate && (shouldOverwrite || !product.coverImage)) {
          await tx.product.update({
            where: { id: product.id },
            data: { coverImage: coverCandidate, updatedAt: now },
          });
        }
      });
      linked += rowsToCreate.length;
    }

    return jsonOk({
      linked,
      skippedDuplicates: duplicateSkips,
    });
  } catch (error) {
    const err = toHttpError(error);
    return jsonError(err.message || "Internal Error", err.status || 500);
  }
}
