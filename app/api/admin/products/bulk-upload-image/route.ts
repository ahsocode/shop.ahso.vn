import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyBearerAuth, requireRole } from "@/lib/auth";
import { uploadProductImageToCloudinary } from "@/lib/cloudinary";
import { randomUUID } from "crypto";
import { jsonError, toHttpError } from "@/lib/http";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const me = await verifyBearerAuth(req);
    requireRole(me, ["ADMIN"]);

    const formData = await req.formData();
    const productIdsRaw = formData.getAll("productIds").filter(Boolean);
    const file = formData.get("file");
    const alt = formData.get("alt")?.toString() ?? null;

    if (!productIdsRaw.length) {
      return jsonError("Missing productIds", 400);
    }
    if (!file || !(file instanceof File)) {
      return jsonError("Missing file", 400);
    }

    const uniqueIds = Array.from(new Set(productIdsRaw.map((id) => String(id))));
    const products = await prisma.product.findMany({
      where: { id: { in: uniqueIds } },
      select: {
        id: true,
        sku: true,
        coverImage: true,
        producttype: {
          select: {
            slug: true,
            productcategory: { select: { slug: true } },
          },
        },
      },
    });

    if (!products.length) {
      return jsonError("No matching products found", 404);
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const uploads = await Promise.all(
      products.map(async (product) => {
        const maxExistingOrder = await prisma.productimage.aggregate({
          where: { productId: product.id },
          _max: { sortOrder: true },
        });
        const nextSortOrder = (maxExistingOrder._max.sortOrder ?? 0) + 1;

        const { secureUrl } = await uploadProductImageToCloudinary({
          buffer,
          productId: product.id,
          sku: product.sku,
          categorySlug: product.producttype?.productcategory?.slug,
          productTypeSlug: product.producttype?.slug,
          fileName: file.name,
          type: "gallery",
          sequence: nextSortOrder,
        });

        const now = new Date();

        const created = await prisma.$transaction(async (tx) => {
          const img = await tx.productimage.create({
            data: {
              id: randomUUID(),
              productId: product.id,
              url: secureUrl,
              alt,
              sortOrder: nextSortOrder,
              createdAt: now,
              updatedAt: now,
            },
          });

          if (!product.coverImage) {
            await tx.product.update({
              where: { id: product.id },
              data: {
                coverImage: img.url,
                updatedAt: now,
              },
            });
          }
          return img;
        });

        return created;
      }),
    );

    return NextResponse.json(
      {
        success: true,
        uploaded: uploads.length,
        images: uploads,
      },
      { status: 201 },
    );
  } catch (error) {
    const err = toHttpError(error);
    return jsonError(err.message || "Internal Error", err.status || 500);
  }
}
