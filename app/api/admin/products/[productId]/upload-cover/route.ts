"use server";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyBearerAuth, requireRole } from "@/lib/auth";
import { uploadProductImageToCloudinary } from "@/lib/cloudinary";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ productId: string }> },
) {
  try {
    const me = await verifyBearerAuth(req);
    requireRole(me, ["ADMIN"]);
    const { productId } = await ctx.params;

    const product = await prisma.product.findUnique({
      where: { id: productId },
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

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { secureUrl } = await uploadProductImageToCloudinary({
      buffer,
      productId,
      sku: product.sku,
      categorySlug: product.producttype?.productcategory?.slug,
      productTypeSlug: product.producttype?.slug,
      fileName: file.name,
      type: "cover",
      sequence: 0,
    });

    const updated = await prisma.product.update({
      where: { id: productId },
      data: { coverImage: secureUrl, updatedAt: new Date() },
      select: { id: true, coverImage: true },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    console.error("Upload product cover error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to upload product cover" },
      { status: 500 },
    );
  }
}
