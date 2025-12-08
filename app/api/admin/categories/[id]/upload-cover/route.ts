import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyBearerAuth, requireRole } from "@/lib/auth";
import { uploadCategoryCoverToCloudinary } from "@/lib/cloudinary";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const me = await verifyBearerAuth(req);
    requireRole(me, ["ADMIN"]);
    const { id } = await ctx.params;

    const cate = await prisma.productcategory.findUnique({
      where: { id },
      select: { id: true, slug: true },
    });
    if (!cate) {
      return NextResponse.json(
        { success: false, error: "Category not found" },
        { status: 404 },
      );
    }

    const form = await req.formData();
    const file = form.get("file");
    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { success: false, error: "Missing file" },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    const { secureUrl } = await uploadCategoryCoverToCloudinary({
      buffer,
      categoryId: id,
      categorySlug: cate.slug,
    });

    const updated = await prisma.productcategory.update({
      where: { id },
      data: { coverImage: secureUrl, updatedAt: new Date() },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    console.error("Upload category cover error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to upload category cover" },
      { status: 500 },
    );
  }
}
