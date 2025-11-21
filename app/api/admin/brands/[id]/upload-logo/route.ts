// app/api/admin/brands/[id]/upload-logo/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyBearerAuth, requireRole } from "@/lib/auth";
import { uploadImageToDriveWebp, ensureBrandFolder } from "@/lib/drive";

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

    const folderId = await ensureBrandFolder(id);

    const { publicUrl } = await uploadImageToDriveWebp({
      buffer,
      originalName: file.name,
      parentFolderId: folderId,
    });

    // nếu muốn xoá logo cũ trên Drive (nếu biết fileId) thì ở đây xử lý thêm

    const updated = await prisma.brand.update({
      where: { id },
      data: { logoUrl: publicUrl, updatedAt: new Date() },
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
