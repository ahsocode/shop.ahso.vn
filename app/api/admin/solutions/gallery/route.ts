import { NextRequest, NextResponse } from "next/server";
import { verifyBearerAuth, requireRole } from "@/lib/auth";
import { listSolutionGalleryAssets, uploadSolutionGalleryToCloudinary } from "@/lib/cloudinary";

export async function GET(req: NextRequest) {
  try {
    const me = await verifyBearerAuth(req);
    requireRole(me, ["ADMIN"]);

    const { searchParams } = new URL(req.url);
    const nextCursor = searchParams.get("nextCursor");
    const maxResults = searchParams.get("maxResults");

    const { items, nextCursor: cursor } = await listSolutionGalleryAssets({
      nextCursor,
      maxResults: maxResults ? Number(maxResults) : undefined,
    });

    return NextResponse.json({ items, nextCursor: cursor }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const me = await verifyBearerAuth(req);
    requireRole(me, ["ADMIN"]);

    const formData = await req.formData();
    const files = formData.getAll("files").filter((item): item is File => item instanceof File);

    if (!files.length) {
      return NextResponse.json({ error: "Missing files" }, { status: 400 });
    }

    const uploads = await Promise.all(
      files.map(async (file) => {
        const buffer = Buffer.from(await file.arrayBuffer());
        const { secureUrl, publicId } = await uploadSolutionGalleryToCloudinary({
          buffer,
          fileName: file.name,
        });
        return { url: secureUrl, publicId };
      }),
    );

    return NextResponse.json({ items: uploads }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
