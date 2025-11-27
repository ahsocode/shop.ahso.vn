import { NextRequest, NextResponse } from "next/server";
import { verifyBearerAuth, requireRole } from "@/lib/auth";
import { listPopupBannerAssets } from "@/lib/cloudinary";

export async function GET(req: NextRequest) {
  const me = await verifyBearerAuth(req);
  requireRole(me, ["ADMIN", "STAFF"]);

  const cursor = req.nextUrl.searchParams.get("cursor");
  const { items, nextCursor } = await listPopupBannerAssets({ nextCursor: cursor });
  return NextResponse.json({ data: items, nextCursor });
}
