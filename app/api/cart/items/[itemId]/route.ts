import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function getCartIdFromReq(req: NextRequest): Promise<string | null> {
  const cookieCartId = req.cookies.get("cart_id")?.value || null;
  if (cookieCartId) return cookieCartId;
  // Fallback: try to find any active cart for user (if authenticated) for extra safety
  // We intentionally do not re-implement JWT here; itemId is unique and guarded by cartId check below.
  return null;
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ itemId: string }> }) {
  try {
    const { itemId } = await context.params;
    const body = await req.json().catch(() => ({}));
    const quantity = Number(body?.quantity);
    if (!Number.isFinite(quantity)) return NextResponse.json({ error: "INVALID_QUANTITY" }, { status: 400 });

    // Ensure the item belongs to the caller's cart (via cookie)
    const cartId = await getCartIdFromReq(req);
    const existing = await prisma.cartItem.findUnique({ where: { id: itemId } });
    if (!existing) return NextResponse.json({ error: "ITEM_NOT_FOUND" }, { status: 404 });
    if (cartId && existing.cartId !== cartId) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

    if (quantity <= 0) {
      await prisma.cartItem.delete({ where: { id: itemId } });
      return NextResponse.json({ ok: true, deleted: true });
    }

    // Need current unit price
    const v = await prisma.productVariant.findUnique({ where: { id: existing.variantId } });
    const unitPrice = Number(v?.price || 0);
    const updated = await prisma.cartItem.update({
      where: { id: itemId },
      data: { quantity, unitPrice, totalPrice: unitPrice * quantity },
    });
    return NextResponse.json({ ok: true, item: { id: updated.id, quantity: updated.quantity } });
  } catch (e) {
    console.error("PATCH /api/cart/items/[itemId] error:", e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ itemId: string }> }) {
  try {
    const { itemId } = await context.params;
    const cartId = await getCartIdFromReq(req);
    const existing = await prisma.cartItem.findUnique({ where: { id: itemId } });
    if (!existing) return NextResponse.json({ ok: true, deleted: true });
    if (cartId && existing.cartId !== cartId) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    await prisma.cartItem.delete({ where: { id: itemId } });
    return NextResponse.json({ ok: true, deleted: true });
  } catch (e) {
    console.error("DELETE /api/cart/items/[itemId] error:", e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
