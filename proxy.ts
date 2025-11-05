import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Proxy middleware for route protection and redirection.
 * Compatible with Next.js 16 (replaces middleware.ts).
 */
export function proxy(request: NextRequest) {
  const token = request.cookies.get("token")?.value;
  const { pathname } = request.nextUrl;

  // ✅ Public routes — ai cũng truy cập được
  const publicRoutes = ["/", "/login", "/register", "/forgot-password", "/shop"];
  const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route));

  // ✅ Các route yêu cầu đăng nhập (người dùng)
  const protectedRoutes = ["/profile", "/wishlist", "/profile/orders"];
  const isProtectedRoute = protectedRoutes.some((route) => pathname.startsWith(route));

  // ✅ Các route dành cho admin
  const adminRoutes = ["/admin"];
  const isAdminRoute = adminRoutes.some((route) => pathname.startsWith(route));

  // ⚙️ Nếu chưa đăng nhập mà truy cập route yêu cầu đăng nhập → chuyển về login
  if (isProtectedRoute && !token) {
    const url = new URL("/login", request.url);
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  // ⚙️ Nếu chưa đăng nhập mà cố vào /admin → chuyển về login
  if (isAdminRoute && !token) {
    const url = new URL("/login", request.url);
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  // 👉 Cho phép tiếp tục bình thường
  return NextResponse.next();
}

/**
 * Matcher: áp dụng proxy cho tất cả route trừ các tài nguyên tĩnh hoặc API.
 */
export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|logo.png|.*\\..*).*)",
  ],
};
