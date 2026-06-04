// app/api/auth/logout/route.ts
import { NextResponse } from "next/server";
import { shouldUseSecureAuthCookie } from "@/lib/auth";

/**
 * POST /api/auth/logout
 * Xóa auth token.
 */
export async function POST() {
  const res = NextResponse.json({ ok: true, message: "Logged out successfully" });
  
  // ⭐ Clear auth cookie
  const secureCookie = shouldUseSecureAuthCookie();
  res.cookies.set("auth_token", "", {
    httpOnly: true,
    secure: secureCookie,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  return res;
}
