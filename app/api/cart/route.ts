import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jwtVerify } from "jose";

const CART_COOKIE = "cart_id";

export const dynamic = "force-dynamic";

async function getUserIdFromReq(req: NextRequest): Promise<string | null> {
  const authHeader = req.headers.get("authorization") || "";
  const bearer = authHeader.match(/^Bearer\s+(.+)$/i)?.[1];
  const token = bearer || req.cookies.get("auth_token")?.value || null;
  if (!token) return null;
  const secret = process.env.JWT_SECRET;
  if (!secret) return null;
  try {
    const res = await jwtVerify(token, new TextEncoder().encode(secret));
    const userId = (res.payload.sub as string) || null;
    return userId;
  } catch {
    return null;
  }
}

async function getOrCreateActiveCart(req: NextRequest) {
  const userId = await getUserIdFromReq(req);
  const cookieCartId = req.cookies.get(CART_COOKIE)?.value || null;

  // If user logged in, prefer user cart
  if (userId) {
    let cart = await prisma.cart.findFirst({ where: { userId, status: "ACTIVE" } });
    if (cart) return { cart, setCookieId: null } as const;
    // If there is a guest cart cookie, try to claim it
    if (cookieCartId) {
      const guestCart = await prisma.cart.findFirst({ where: { id: cookieCartId, status: "ACTIVE" } });
      if (guestCart) {
        cart = await prisma.cart.update({ where: { id: guestCart.id }, data: { userId } });
        return { cart, setCookieId: guestCart.id } as const;
      }
    }
    const newCart = await prisma.cart.create({ data: { userId, status: "ACTIVE" } });
    return { cart: newCart, setCookieId: newCart.id } as const;
  }

  // Guest cart via cookie
  if (cookieCartId) {
    const cart = await prisma.cart.findFirst({ where: { id: cookieCartId, status: "ACTIVE" } });
    if (cart) return { cart, setCookieId: cart.id } as const;
  }

  const newCart = await prisma.cart.create({ data: { status: "ACTIVE" } });
  return { cart: newCart, setCookieId: newCart.id } as const;
}

function serializeCart(cart: any, items: any[]) {
  const mapItems = items.map((it) => {
    const v = it.variant;
    const p = v?.product;
    return {
      id: it.id,
      variantId: v?.id || null,
      variantSku: v?.variantSku || null,
      quantity: it.quantity,
      unitPrice: Number(it.unitPrice || 0),
      totalPrice: Number(it.totalPrice || 0),
      productSlug: p?.slug || null,
      productTitle: p?.title || (v?.variantSku ?? null),
      image: p?.imagesCover || null,
      currency: v?.currency || "VND",
      inStock: (v?.stockOnHand ?? 0) - (v?.stockReserved ?? 0) > 0,
    };
  });
  const subtotal = mapItems.reduce((s, x) => s + (x.totalPrice || 0), 0);
  return {
    id: cart.id,
    status: cart.status,
    items: mapItems,
    count: mapItems.reduce((s, x) => s + (x.quantity || 0), 0),
    subtotal,
    currency: mapItems[0]?.currency ?? "VND",
  };
}

export async function GET(req: NextRequest) {
  try {
    const { cart, setCookieId } = await getOrCreateActiveCart(req);
    const items = await prisma.cartItem.findMany({
      where: { cartId: cart.id },
      include: { variant: { include: { product: true } } },
      orderBy: { addedAt: "desc" },
      take: 200,
    });

    const res = NextResponse.json({ cart: serializeCart(cart, items) });
    if (setCookieId) {
      res.cookies.set(CART_COOKIE, setCookieId, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 24 * 30, // 30d
      });
    }
    return res;
  } catch (e) {
    console.error("GET /api/cart error:", e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// Clear cart items
export async function DELETE(req: NextRequest) {
  try {
    const { cart } = await getOrCreateActiveCart(req);
    await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("DELETE /api/cart error:", e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
