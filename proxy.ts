import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";


export function proxy(request: NextRequest) {
 
  const token = request.cookies.get("auth_token")?.value;
  const { pathname } = request.nextUrl;

 
  const publicRoutes = ["/", "/login", "/register", "/forgot-password", "/shop"];
  const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route));

  const protectedRoutes = ["/profile", "/wishlist", "/profile/orders"];
  const isProtectedRoute = protectedRoutes.some((route) => pathname.startsWith(route));

 
  const adminRoutes = ["/admin"];
  const isAdminRoute = adminRoutes.some((route) => pathname.startsWith(route));


  if (isProtectedRoute && !token) {
    const url = new URL("/login", request.url); 
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  
  if (isAdminRoute && !token) {
    const url = new URL("/login", request.url);
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }


  return NextResponse.next();
}


export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|logo.png|.*\\..*).*)",
  ],
};
