"use server";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyBearerAuth, requireRole } from "@/lib/auth";
import { uploadProductImageToCloudinary } from "@/lib/cloudinary";

export async function POST(req: NextRequest) {
  try {
    const me = await verifyBearerAuth(req);
    requireRole(me, ["ADMIN"]);

    const formData = await req.formData();
    const file = formData.get("file");
    const typeId = formData.get("typeId");
    const rawSku = formData.get("sku");
    const kind = (formData.get("kind")?.toString() || "gallery") as
      | "cover"
      | "gallery";
    const sequenceValue = formData.get("sequence");
    const sequence =
      typeof sequenceValue === "string" && sequenceValue.trim()
        ? Number(sequenceValue)
        : undefined;

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "Missing file" }, { status: 400 });
    }
    if (typeof typeId !== "string" || !typeId) {
      return NextResponse.json({ error: "typeId is required" }, { status: 400 });
    }
    if (typeof rawSku !== "string" || !rawSku.trim()) {
      return NextResponse.json({ error: "sku is required" }, { status: 400 });
    }

    const type = await prisma.producttype.findUnique({
      where: { id: typeId },
      select: {
        slug: true,
        productcategory: { select: { slug: true } },
      },
    });
    if (!type) {
      return NextResponse.json(
        { error: "Không tìm thấy loại sản phẩm" },
        { status: 404 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const { secureUrl } = await uploadProductImageToCloudinary({
      buffer,
      productId: typeId,
      sku: rawSku.trim(),
      categorySlug: type.productcategory?.slug,
      productTypeSlug: type.slug,
      fileName: file.name,
      type: kind === "cover" ? "cover" : "gallery",
      sequence,
    });

    return NextResponse.json(
      { success: true, data: { url: secureUrl } },
      { status: 201 },
    );
  } catch (error) {
    console.error("UPLOAD_PRODUCT_TEMP_ERROR", error);
    const message =
      error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
