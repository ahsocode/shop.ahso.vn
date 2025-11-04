
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  const token = request.cookies.get("token")?.value
  const { pathname } = request.nextUrl

  // Public routes that don't require authentication
  const publicRoutes = ["/", "/login", "/register", "/forgot-password", "/shop"]
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route))

  // Protected routes
  const protectedRoutes = ["/profile", "/orders", "/wishlist"]
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))

  // Admin routes
  const adminRoutes = ["/admin"]
  const isAdminRoute = adminRoutes.some(route => pathname.startsWith(route))

  // Redirect to login if accessing protected route without token
  if (isProtectedRoute && !token) {
    const url = new URL("/login", request.url)
    url.searchParams.set("redirect", pathname)
    return NextResponse.redirect(url)
  }

  // For admin routes, we'll check the role in the component
  // because middleware can't easily decode JWT
  
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|logo.png|.*\\..*).)*",
  ],
}