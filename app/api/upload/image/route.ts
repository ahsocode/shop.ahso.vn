// app/api/profile/upload-avatar/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

import {
  uploadImageToDriveWebp,
  ensureUserAvatarFolder,
} from "@/lib/drive";
import { getUserIdFromReq } from "@/lib/auth-request";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserIdFromReq(req);
    if (!userId) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "FILE_REQUIRED" },
        { status: 400 },
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // folder: AHSO Assets / users / avatars / <userId>
    const parentFolderId = await ensureUserAvatarFolder(userId);

    const { publicUrl } = await uploadImageToDriveWebp({
      buffer,
      originalName: file.name || "avatar.png",
      parentFolderId,
    });

    await prisma.user.update({
      where: { id: userId },
      data: { avatarUrl: publicUrl },
    });

    return NextResponse.json({ avatarUrl: publicUrl });
  } catch (e) {
    console.error("UPLOAD_AVATAR_ERROR", e);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
