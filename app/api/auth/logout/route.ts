// app/api/auth/logout/route.ts
import { NextResponse } from "next/server";

/**
 * POST /api/auth/logout
 * Xóa auth token và KHÔNG xóa cart_id (guest cart vẫn giữ)
 */
export async function POST() {
  const res = NextResponse.json({ ok: true, message: "Logged out successfully" });
  
  // ⭐ Clear auth cookie
  res.cookies.set("auth_token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  // ⭐ KHÔNG xóa cart_id - để user tiếp tục dùng guest cart
  // Nếu muốn xóa cart khi logout (reset về trống), uncomment dòng dưới:
  // res.cookies.delete("cart_id");

  return res;
}