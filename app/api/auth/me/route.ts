// app/api/auth/me/route.ts
import { NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "../../../../lib/prisma";

export const runtime = "nodejs";

// tiny cookie parser (đủ dùng cho trường hợp này)
function getCookieFromHeader(req: Request, name: string): string | null {
  const cookie = req.headers.get("cookie") || "";
  const escaped = name.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
  const m = cookie.match(new RegExp(`(?:^|; )${escaped}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : null;
}

function getTokenFromRequest(req: Request): string | null {
  // 1) Ưu tiên cookie HttpOnly cho web
  const cookieToken = getCookieFromHeader(req, "auth_token");
  if (cookieToken) return cookieToken;

  // 2) Fallback: Authorization Bearer (mobile/SPA)
  const auth = req.headers.get("authorization") || "";
  const m = auth.match(/^Bearer\s+(.+)$/i);
  return m ? m[1] : null;
}

export async function GET(req: Request) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) {
      return NextResponse.json({ error: "MISSING_TOKEN" }, { status: 401 });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return NextResponse.json({ error: "SERVER_MISCONFIGURED" }, { status: 500 });
    }

    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
    const userId = payload.sub as string | undefined;
    if (!userId) {
      return NextResponse.json({ error: "INVALID_TOKEN" }, { status: 401 });
    }

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

    // Chuẩn hoá đầu ra cho FE
    const result = {
      ...user,
      phone: user.phoneE164,
      avatarUrl: user.avatarUrl ?? "/logo.png",
    };

    return NextResponse.json({ user: result }, { status: 200 });
  } catch (err) {
    console.error("ME ERROR:", err);
    return NextResponse.json({ error: "INVALID_TOKEN" }, { status: 401 });
  }
}
