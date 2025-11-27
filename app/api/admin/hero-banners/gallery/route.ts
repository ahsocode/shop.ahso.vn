import { NextRequest, NextResponse } from "next/server";
import { verifyBearerAuth, requireRole } from "@/lib/auth";
import { listHeroBannerAssets } from "@/lib/cloudinary";

export async function GET(req: NextRequest) {
  const me = await verifyBearerAuth(req);
  requireRole(me, ["ADMIN", "STAFF"]);

  const cursor = req.nextUrl.searchParams.get("cursor");
  const { items, nextCursor } = await listHeroBannerAssets({
    nextCursor: cursor,
  });
  return NextResponse.json({ data: items, nextCursor });
}
