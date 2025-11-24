import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { uploadProductTypeCoverToCloudinary } from "@/lib/cloudinary";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");
    const typeId = formData.get("typeId");

    if (typeof typeId !== "string") {
      return NextResponse.json({ error: "TYPE_ID_REQUIRED" }, { status: 400 });
    }

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "FILE_REQUIRED" }, { status: 400 });
    }

    const pt = await prisma.producttype.findUnique({
      where: { id: typeId },
      select: {
        id: true,
        slug: true,
        productcategory: { select: { slug: true } },
      },
    });
    if (!pt) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { secureUrl } = await uploadProductTypeCoverToCloudinary({
      buffer,
      productTypeId: typeId,
      productTypeSlug: pt.slug,
      categorySlug: pt.productcategory?.slug,
    });

    const updated = await prisma.producttype.update({
      where: { id: typeId },
      data: { coverImage: secureUrl },
      select: {
        id: true,
        name: true,
        slug: true,
        coverImage: true,
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("UPLOAD PRODUCT TYPE COVER ERROR:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
