import { NextRequest, NextResponse } from "next/server";
import { verifyBearerAuth, requireRole } from "@/lib/auth";
import { listBrandLogosFromCloudinary } from "@/lib/cloudinary";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const me = await verifyBearerAuth(req);
    requireRole(me, ["ADMIN"]);

    const { searchParams } = new URL(req.url);
    const cursor = searchParams.get("cursor");
    const limitRaw = searchParams.get("limit");
    const parsedLimit = limitRaw ? Number(limitRaw) : undefined;

    const result = await listBrandLogosFromCloudinary({
      nextCursor: cursor || undefined,
      maxResults: Number.isFinite(parsedLimit) ? parsedLimit : undefined,
    });

    return NextResponse.json({
      success: true,
      items: result.items,
      nextCursor: result.nextCursor,
    });
  } catch (error) {
    console.error("brand gallery error", error);
    return NextResponse.json(
      { success: false, error: "Không thể tải thư viện logo" },
      { status: 500 },
    );
  }
}
