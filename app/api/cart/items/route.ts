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

  if (userId) {
    let cart = await prisma.cart.findFirst({ where: { userId, status: "ACTIVE" } });
    if (cart) return { cart, setCookieId: null } as const;
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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const sku = (body?.sku as string | undefined)?.trim();
    const quantity = Math.max(1, Number(body?.quantity ?? 1));
    if (!sku) return NextResponse.json({ error: "MISSING_SKU" }, { status: 400 });

    const { cart, setCookieId } = await getOrCreateActiveCart(req);

    const variant = await prisma.productVariant.findUnique({ where: { variantSku: sku }, include: { product: true } });
    if (!variant) return NextResponse.json({ error: "VARIANT_NOT_FOUND" }, { status: 404 });

    // If exists -> increase quantity; else create
    const existing = await prisma.cartItem.findFirst({ where: { cartId: cart.id, variantId: variant.id } });
    const unitPrice = variant.price as unknown as number; // Decimal -> number
    if (existing) {
      const newQty = existing.quantity + quantity;
      await prisma.cartItem.update({
        where: { id: existing.id },
        data: { quantity: newQty, unitPrice, totalPrice: newQty * unitPrice },
      });
    } else {
      await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          variantId: variant.id,
          quantity,
          unitPrice,
          totalPrice: unitPrice * quantity,
        },
      });
    }

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
        maxAge: 60 * 60 * 24 * 30,
      });
    }
    return res;
  } catch (e) {
    console.error("POST /api/cart/items error:", e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
