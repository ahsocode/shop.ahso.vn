import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyBearerAuth, requireRole } from "@/lib/auth";
import { listProductGalleryAssets } from "@/lib/cloudinary";

export async function GET(req: NextRequest) {
  try {
    const me = await verifyBearerAuth(req);
    requireRole(me, ["ADMIN"]);

    const { searchParams } = new URL(req.url);
    const typeId = searchParams.get("typeId");
    const nextCursor = searchParams.get("nextCursor");
    const maxResults = searchParams.get("maxResults");

    if (!typeId) {
      return NextResponse.json({ error: "typeId is required" }, { status: 400 });
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

    const { items, nextCursor: cursor } = await listProductGalleryAssets({
      categorySlug: type.productcategory?.slug,
      productTypeSlug: type.slug,
      nextCursor,
      maxResults: maxResults ? Number(maxResults) : undefined,
    });

    return NextResponse.json({ items, nextCursor: cursor }, { status: 200 });
  } catch (error) {
    console.error("LIST_PRODUCT_GALLERY_ERROR", error);
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
