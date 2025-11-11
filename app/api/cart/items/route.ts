// app/api/cart/items/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const CART_COOKIE = "cart_id";
const COOKIE_OPTS = {
  httpOnly: true as const,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 24 * 30, // 30 days
};

type TotItem = { quantity: number; unitPrice: any };

function calcTotals(items: TotItem[]) {
  const subtotal = items.reduce((s, it) => s + Number(it.unitPrice) * it.quantity, 0);
  const discountTotal = 0;
  const taxTotal = 0;
  const shippingFee = 0;
  const grandTotal = subtotal - discountTotal + taxTotal + shippingFee;
  return { subtotal, discountTotal, taxTotal, shippingFee, grandTotal };
}

async function getOrCreateCart(req: NextRequest) {
  const cookieId = req.cookies.get(CART_COOKIE)?.value || null;
  if (cookieId) {
    const found = await prisma.cart.findUnique({ where: { id: cookieId } });
    if (found) return { cart: found, created: false };
  }
  const created = await prisma.cart.create({ data: { status: "ACTIVE" } });
  return { cart: created, created: true };
}

/** POST /api/cart/items  body: { sku: string, qty?: number } */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const sku = String(body?.sku ?? "").trim();
    const quantity = Math.max(1, Number(body?.qty ?? body?.quantity ?? 1));

    if (!sku) {
      return NextResponse.json({ error: "MISSING_SKU" }, { status: 400 });
    }

    const { cart, created } = await getOrCreateCart(req);

    // Find product by SKU (fits your client)
    const product = await prisma.product.findUnique({
      where: { sku },
      // include: { brand: true }, // uncomment if you need brandName
    });
    if (!product) {
      return NextResponse.json({ error: "PRODUCT_NOT_FOUND" }, { status: 404 });
    }

    // If line exists -> increase quantity
    const existing = await prisma.cartItem.findFirst({
      where: { cartId: cart.id, productId: product.id },
    });

    const unitPrice = product.price; // Decimal
    if (existing) {
      const newQty = existing.quantity + quantity;
      await prisma.cartItem.update({
        where: { id: existing.id },
        data: {
          quantity: newQty,
          unitPrice,
          lineTotal: Number(unitPrice) * newQty,
        },
      });
    } else {
      await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId: product.id,
          productName: product.name,
          productSku: product.sku,
          productSlug: product.slug,
          productImage: product.coverImage ?? null,
          // brandName: product.brand?.name ?? null,
          unitLabel: null,
          quantityLabel: product.quantityLabel ?? null,
          unitPrice, // Decimal
          currency: product.currency,
          taxIncluded: product.taxIncluded,
          quantity,
          lineTotal: Number(unitPrice) * quantity,
        },
      });
    }

    // Update totals
    const items = await prisma.cartItem.findMany({ where: { cartId: cart.id } });
    const totals = calcTotals(items);
    await prisma.cart.update({
      where: { id: cart.id },
      data: {
        subtotal: totals.subtotal,
        discountTotal: totals.discountTotal,
        taxTotal: totals.taxTotal,
        shippingFee: totals.shippingFee,
        grandTotal: totals.grandTotal,
      },
    });

    const full = await prisma.cart.findUnique({
      where: { id: cart.id },
      include: { items: true },
    });

    const res = NextResponse.json(full, { status: 201 });
    if (created) {
      res.cookies.set(CART_COOKIE, cart.id, COOKIE_OPTS);
    }
    return res;
  } catch (e) {
    console.error("POST /api/cart/items error:", e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
