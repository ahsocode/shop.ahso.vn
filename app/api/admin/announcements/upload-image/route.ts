import { NextRequest, NextResponse } from "next/server";
import { verifyBearerAuth, requireRole } from "@/lib/auth";
import { uploadPopupBannerImage } from "@/lib/cloudinary";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const me = await verifyBearerAuth(req);
  requireRole(me, ["ADMIN"]);

  const formData = await req.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "FILE_REQUIRED" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const result = await uploadPopupBannerImage({ buffer, fileName: file.name });
  return NextResponse.json({ url: result.secureUrl, publicId: result.publicId });
}
