// app/api/cart/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const CART_COOKIE = "cart_id";
const COOKIE_OPTS = {
  httpOnly: true as const,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 24 * 30,
};

async function getOrCreateCart(req: NextRequest) {
  const cookieId = req.cookies.get(CART_COOKIE)?.value || null;
  if (cookieId) {
    const found = await prisma.cart.findUnique({ where: { id: cookieId } });
    if (found) return { cart: found, created: false };
  }
  // nếu schema Cart của bạn có default status, OK; nếu không, thêm { status: "ACTIVE" }
  const created = await prisma.cart.create({ data: { status: "ACTIVE" } });
  return { cart: created, created: true };
}

export async function GET(req: NextRequest) {
  const { cart, created } = await getOrCreateCart(req);

  const full = await prisma.cart.findUnique({
    where: { id: cart.id },
    include: { items: true },
  });

  const res = NextResponse.json(full ?? { id: cart.id, items: [] });
  if (created) {
    res.cookies.set(CART_COOKIE, cart.id, COOKIE_OPTS);
  }
  return res;
}
