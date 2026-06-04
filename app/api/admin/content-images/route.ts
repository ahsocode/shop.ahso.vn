import { NextRequest, NextResponse } from "next/server";
import { verifyBearerAuth, requireRole } from "@/lib/auth";
import { listContentEditorAssets, uploadContentEditorImageToCloudinary } from "@/lib/cloudinary";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const me = await verifyBearerAuth(req);
    requireRole(me, ["ADMIN"]);

    const { searchParams } = new URL(req.url);
    const nextCursor = searchParams.get("nextCursor");
    const maxResults = searchParams.get("maxResults");

    const { items, nextCursor: cursor } = await listContentEditorAssets({
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
    const singleFile = formData.get("file");
    if (singleFile instanceof File) files.push(singleFile);

    if (!files.length) {
      return NextResponse.json({ error: "Vui lòng chọn ảnh để upload." }, { status: 400 });
    }

    const uploads = await Promise.all(
      files.map(async (file) => {
        if (!file.type.startsWith("image/")) {
          throw new Error("Chỉ hỗ trợ upload file ảnh.");
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const { secureUrl, publicId } = await uploadContentEditorImageToCloudinary({
          buffer,
          fileName: file.name,
        });
        return { secureUrl, url: secureUrl, publicId };
      }),
    );

    return NextResponse.json({ items: uploads }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
