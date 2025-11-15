// app/api/auth/me/route.ts
import { NextResponse } from "next/server";
import { jwtVerify } from "jose";
import type { Prisma } from "@prisma/client";
import { prisma, prismaSupportsUserBlockField } from "../../../../lib/prisma";

function getTokenFromRequest(req: Request): string | null {
  // 1. Check Authorization header
  const auth = req.headers.get("authorization") || "";
  const m = auth.match(/^Bearer\s+(.+)$/i);
  if (m) return m[1];

  // 2. Check cookie (fallback)
  const cookie = req.headers.get("cookie") || "";
  const cookieMatch = cookie.match(/(?:^|;\s*)auth_token=([^;]*)/);
  return cookieMatch ? decodeURIComponent(cookieMatch[1]) : null;
}

export async function GET(req: Request) {
  try {
    const token = getTokenFromRequest(req);
    
    if (!token) {
      console.error("❌ No token in request");
      return NextResponse.json({ error: "MISSING_TOKEN" }, { status: 401 });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error("❌ Missing JWT_SECRET");
      return NextResponse.json({ error: "SERVER_MISCONFIGURED" }, { status: 500 });
    }

    let payload;
    try {
      const result = await jwtVerify(token, new TextEncoder().encode(secret));
      payload = result.payload;
    } catch (err) {
      console.error("❌ JWT verification failed:", err);
      return NextResponse.json({ error: "INVALID_TOKEN" }, { status: 401 });
    }

    const userId = payload.sub as string | undefined;
    if (!userId) {
      console.error("❌ No user ID in token payload");
      return NextResponse.json({ error: "INVALID_TOKEN" }, { status: 401 });
    }

    const baseSelect: Record<string, true> = {
      id: true,
      username: true,
      fullName: true,
      email: true,
      phoneE164: true,
      role: true,
      createdAt: true,
      avatarUrl: true,
    };
    if (prismaSupportsUserBlockField) baseSelect.isBlocked = true;
    const BASE_SELECT = {
      id: true,
      username: true,
      fullName: true,
      email: true,
      phoneE164: true,
      role: true,
      createdAt: true,
      avatarUrl: true,
    } satisfies Prisma.UserSelect;
    const select: Prisma.UserSelect = prismaSupportsUserBlockField
      ? { ...BASE_SELECT, isBlocked: true }
      : BASE_SELECT;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select,
    });

    if (!user) {
      console.error("❌ User not found:", userId);
      return NextResponse.json({ error: "USER_NOT_FOUND" }, { status: 404 });
    }

    const isBlocked = prismaSupportsUserBlockField ? Boolean(user.isBlocked) : false;
    if (isBlocked) {
      return NextResponse.json({ error: "ACCOUNT_BLOCKED" }, { status: 403 });
    }

    console.log("✅ User verified:", user.email);

    return NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        email: user.email,
        phoneE164: user.phoneE164,
        phone: user.phoneE164,
        role: user.role,
        createdAt: user.createdAt,
        avatarUrl: user.avatarUrl ?? "/logo.png",
      },
    });
  } catch (err) {
    console.error("❌ ME ERROR:", err);
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
