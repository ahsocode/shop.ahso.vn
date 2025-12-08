import { NextRequest, NextResponse } from "next/server";
import { getUserIdFromReq } from "../route"; // đã export ở file profile/route.ts
import { uploadAvatarToCloudinary } from "@/lib/cloudinary";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserIdFromReq(req as unknown as Request);
    if (!userId) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "NO_FILE" }, { status: 400 });
    }

    // Next.js File -> Buffer
    const arrayBuffer = await (file as File).arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const { secureUrl } = await uploadAvatarToCloudinary({
      buffer,
      userId,
    });

    console.log("UPLOAD_AVATAR_SUCCESS", { userId, secureUrl });

    return NextResponse.json({ avatarUrl: secureUrl });
  } catch (err) {
    console.error("UPLOAD_AVATAR_ERROR", err);
    const msg =
      err instanceof Error ? err.message : "INTERNAL_SERVER_ERROR";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
