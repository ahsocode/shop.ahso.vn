// app/api/admin/products/[productId]/upload-image/route.ts
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { verifyBearerAuth, requireRole } from "@/lib/auth";
import { uploadImageToDriveWebp, ensureProductSubFolder } from "@/lib/drive";

export const runtime = "nodejs"; // cẩn thận để không rơi vào edge

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ productId: string }> },
) {
  try {
    const me = await verifyBearerAuth(req);
    requireRole(me, ["ADMIN"]);

    const { productId } = await ctx.params;

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      return NextResponse.json(
        { success: false, error: "productId not found" },
        { status: 404 },
      );
    }

    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { success: false, error: "Missing file" },
        { status: 400 },
      );
    }

    // Convert File → Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Folder Drive: products/{productId}/images
    const imagesFolderId = await ensureProductSubFolder(productId, "images");

    const { publicUrl } = await uploadImageToDriveWebp({
      buffer,
      originalName: file.name,
      parentFolderId: imagesFolderId,
    });

    const now = new Date();

    const createdImage = await prisma.$transaction(async (tx) => {
      // sortOrder = max + 1
      const maxOrder = await tx.productimage.aggregate({
        where: { productId },
        _max: { sortOrder: true },
      });

      const sortOrder = (maxOrder._max.sortOrder ?? 0) + 1;

      const img = await tx.productimage.create({
        data: {
          id: randomUUID(),
          productId,
          url: publicUrl,
          alt: formData.get("alt")?.toString() ?? null,
          sortOrder,
          createdAt: now,
          updatedAt: now,
        },
      });

      // nếu chưa có coverImage thì set luôn
      if (!product.coverImage) {
        await tx.product.update({
          where: { id: productId },
          data: {
            coverImage: img.url,
            updatedAt: now,
          },
        });
      }

      return img;
    });

    return NextResponse.json(
      { success: true, data: createdImage },
      { status: 201 },
    );
  } catch (err) {
    console.error("Upload product image error:", err);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to upload product image",
      },
      { status: 500 },
    );
  }
}
