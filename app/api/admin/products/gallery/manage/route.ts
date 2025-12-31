import { NextRequest, NextResponse } from "next/server";
import { verifyBearerAuth, requireRole } from "@/lib/auth";
import { deleteCloudinaryAssets } from "@/lib/cloudinary";

export async function DELETE(req: NextRequest) {
  try {
    const me = await verifyBearerAuth(req);
    requireRole(me, ["ADMIN"]);

    const body = await req.json().catch(() => null);
    const publicIds = Array.isArray(body?.publicIds)
      ? body.publicIds.map((id: unknown) => String(id)).filter(Boolean)
      : [];
    if (!publicIds.length) {
      return NextResponse.json({ error: "publicIds is required" }, { status: 400 });
    }

    const result = await deleteCloudinaryAssets({ publicIds, invalidate: true });
    return NextResponse.json({ success: true, ...result }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
