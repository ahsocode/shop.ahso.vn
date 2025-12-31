import { NextRequest, NextResponse } from "next/server";
import { draftMode } from "next/headers";
import { verifyBearerAuth, requireRole } from "@/lib/auth";

const ALLOWED = new Set(["software", "solutions"]);

export async function GET(req: NextRequest) {
  try {
    const me = await verifyBearerAuth(req);
    requireRole(me, ["ADMIN"]);

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "";
    const slug = searchParams.get("slug") || "";

    if (!ALLOWED.has(type) || !slug) {
      return NextResponse.json({ error: "Invalid preview params" }, { status: 400 });
    }

    // Enable draft mode so detail pages load DRAFT content
    const draft = await draftMode();
    draft.enable();

    const url = type === "software" ? `/software/${slug}` : `/solutions/${slug}`;
    return NextResponse.json({ url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
