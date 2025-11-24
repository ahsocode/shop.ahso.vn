// app/api/admin/brands/[id]/upload-logo/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyBearerAuth, requireRole } from "@/lib/auth";
import { uploadBrandLogoToCloudinary } from "@/lib/cloudinary";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const me = await verifyBearerAuth(req);
    requireRole(me, ["ADMIN"]);
    const { id } = await ctx.params;

    const brand = await prisma.brand.findUnique({ where: { id } });
    if (!brand) {
      return NextResponse.json(
        { success: false, error: "Brand not found" },
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

    const { secureUrl } = await uploadBrandLogoToCloudinary({
      buffer,
      brandId: id,
    });

    const updated = await prisma.brand.update({
      where: { id },
      data: { logoUrl: secureUrl, updatedAt: new Date() },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    console.error("Upload brand logo error:", err);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to upload brand logo",
      },
      { status: 500 },
    );
  }
}
