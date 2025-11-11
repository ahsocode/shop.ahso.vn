// app/api/cart/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyRequestUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const CART_COOKIE = "cart_id";
const COOKIE_OPTS = {
  httpOnly: true as const,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 24 * 30, // 30 days
};

/**
 * Lấy hoặc tạo cart cho user đã đăng nhập
 */
async function getOrCreateUserCart(userId: string) {
  let cart = await prisma.cart.findFirst({
    where: { userId, status: "ACTIVE" },
    include: { items: true },
  });

  if (!cart) {
    cart = await prisma.cart.create({
      data: { userId, status: "ACTIVE" },
      include: { items: true },
    });
  }

  return cart;
}

/**
 * Lấy hoặc tạo cart cho guest (theo cookie)
 */
async function getOrCreateGuestCart(cookieId: string | null) {
  if (cookieId) {
    const found = await prisma.cart.findUnique({
      where: { id: cookieId },
      include: { items: true },
    });
    // Chỉ dùng cart này nếu nó không thuộc về user nào
    if (found && !found.userId) {
      return { cart: found, created: false };
    }
  }

  // Tạo cart mới cho guest
  const created = await prisma.cart.create({
    data: { status: "ACTIVE", userId: null },
    include: { items: true },
  });

  return { cart: created, created: true };
}

export async function GET(req: NextRequest) {
  try {
    // Kiểm tra user đã đăng nhập chưa
    const user = await verifyRequestUser(req);

    if (user?.sub) {
      // USER ĐÃ ĐĂNG NHẬP → dùng cart theo userId
      const cart = await getOrCreateUserCart(user.sub);
      
      // Clear cookie cart_id nếu có (không dùng cho logged-in user)
      const res = NextResponse.json(cart);
      res.cookies.delete(CART_COOKIE);
      return res;
    } else {
      // GUEST → dùng cart theo cookie
      const cookieId = req.cookies.get(CART_COOKIE)?.value || null;
      const { cart, created } = await getOrCreateGuestCart(cookieId);

      const res = NextResponse.json(cart);
      
      // Set cookie nếu là cart mới
      if (created) {
        res.cookies.set(CART_COOKIE, cart.id, COOKIE_OPTS);
      }

      return res;
    }
  } catch (error) {
    console.error("GET /api/cart error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}