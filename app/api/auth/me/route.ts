import { NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "../../../../lib/prisma";

export async function GET(req: Request) {
  try {
    const auth = req.headers.get("authorization");
    if (!auth || !auth.startsWith("Bearer ")) {
      return NextResponse.json({ error: "MISSING_TOKEN" }, { status: 401 });
    }

    const token = auth.slice(7);
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error("Missing JWT_SECRET");

    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
    const userId = payload.sub as string;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        fullName: true,
        email: true,
        phoneE164: true,
        role: true,
        createdAt: true,
        avatarUrl: true, 
      },
    });

    if (!user) {
      return NextResponse.json({ error: "USER_NOT_FOUND" }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (err: any) {
    console.error("ME ERROR:", err);
    return NextResponse.json({ error: "INVALID_TOKEN" }, { status: 401 });
  }
}
