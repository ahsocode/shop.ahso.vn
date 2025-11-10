// app/api/cart/items/[itemId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function getCartIdFromReq(req: NextRequest): string | null {
  return req.cookies.get("cart_id")?.value ?? null;
}

/** PATCH /api/cart/items/[itemId]  body: { quantity: number } */
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ itemId: string }> }
) {
  try {
    const { itemId } = await context.params;
    const body = await req.json().catch(() => ({}));
    const quantity = Number(body?.quantity);

    if (!Number.isFinite(quantity) || quantity < 0) {
      return NextResponse.json({ error: "INVALID_QUANTITY" }, { status: 400 });
    }

    const cartId = getCartIdFromReq(req);

    const existing = await prisma.cartItem.findUnique({
      where: { id: itemId },
      include: {
        product: { select: { price: true, stockOnHand: true } },
      },
    });
    if (!existing) return NextResponse.json({ error: "ITEM_NOT_FOUND" }, { status: 404 });
    if (cartId && existing.cartId !== cartId) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    // Delete if quantity == 0
    if (quantity === 0) {
      await prisma.cartItem.delete({ where: { id: itemId } });
      await recalc(existing.cartId);
      return NextResponse.json({ ok: true, deleted: true });
    }

    // Check stock
    if (existing.product && quantity > existing.product.stockOnHand) {
      return NextResponse.json(
        { error: "INSUFFICIENT_STOCK", available: existing.product.stockOnHand },
        { status: 400 }
      );
    }

    const unitPrice =
      existing.product?.price != null
        ? Number(existing.product.price)
        : Number(existing.unitPrice);

    const lineTotal = unitPrice * quantity;

    const updated = await prisma.cartItem.update({
      where: { id: itemId },
      data: { quantity, unitPrice, lineTotal },
    });

    await recalc(existing.cartId);

    return NextResponse.json({
      ok: true,
      item: {
        id: updated.id,
        quantity: updated.quantity,
        unitPrice: updated.unitPrice,
        lineTotal: updated.lineTotal,
      },
    });
  } catch (e) {
    console.error("PATCH /api/cart/items/[itemId] error:", e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

/** DELETE /api/cart/items/[itemId] */
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ itemId: string }> }
) {
  try {
    const { itemId } = await context.params;
    const cartId = getCartIdFromReq(req);

    const existing = await prisma.cartItem.findUnique({ where: { id: itemId } });
    if (!existing) return NextResponse.json({ ok: true, deleted: true });

    if (cartId && existing.cartId !== cartId) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    await prisma.cartItem.delete({ where: { id: itemId } });
    await recalc(existing.cartId);

    return NextResponse.json({ ok: true, deleted: true });
  } catch (e) {
    console.error("DELETE /api/cart/items/[itemId] error:", e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

/** Recalculate totals for a cart */
async function recalc(cartId: string) {
  const items = await prisma.cartItem.findMany({ where: { cartId } });
  const subtotal = items.reduce((s, it) => s + Number(it.lineTotal || 0), 0);

  const cart = await prisma.cart.findUnique({
    where: { id: cartId },
    select: { shippingFee: true, discountTotal: true, taxTotal: true },
  });

  const shippingFee = cart ? Number(cart.shippingFee || 0) : 0;
  const discountTotal = cart ? Number(cart.discountTotal || 0) : 0;
  const taxTotal = cart ? Number(cart.taxTotal || 0) : 0;
  const grandTotal = subtotal - discountTotal + taxTotal + shippingFee;

  await prisma.cart.update({
    where: { id: cartId },
    data: { subtotal, grandTotal, shippingFee, discountTotal, taxTotal },
  });
}
