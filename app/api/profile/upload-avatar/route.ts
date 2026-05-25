import { NextRequest, NextResponse } from "next/server";
import { getUserIdFromReq } from "@/lib/auth-request";
import { uploadAvatarToCloudinary } from "@/lib/cloudinary";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserIdFromReq(req);
    if (!userId) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "NO_FILE" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const { secureUrl } = await uploadAvatarToCloudinary({
      buffer,
      userId,
    });

    console.log("UPLOAD_AVATAR_SUCCESS", { userId, secureUrl });

    return NextResponse.json({ avatarUrl: secureUrl });
  } catch (err) {
    console.error("UPLOAD_AVATAR_ERROR", err);
    const message = err instanceof Error ? err.message : "INTERNAL_SERVER_ERROR";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
