// app/api/cart/items/[itemId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyRequestUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * Kiểm tra quyền sở hữu cart item
 * - Logged-in user: cart phải có userId trùng
 * - Guest: cart không có userId VÀ cookie cart_id phải trùng
 */
async function verifyCartItemOwnership(
  req: NextRequest,
  cartItem: { cartId: string }
): Promise<boolean> {
  const user = await verifyRequestUser(req);

  if (user?.sub) {
    // User đã đăng nhập → cart phải thuộc user này
    const cart = await prisma.cart.findUnique({
      where: { id: cartItem.cartId },
      select: { userId: true },
    });
    return cart?.userId === user.sub;
  } else {
    // Guest → cart không có userId VÀ cookie phải khớp
    const cart = await prisma.cart.findUnique({
      where: { id: cartItem.cartId },
      select: { userId: true, id: true },
    });

    if (cart?.userId) {
      // Cart này thuộc user khác
      return false;
    }

    const cookieCartId = req.cookies.get("cart_id")?.value;
    return cart?.id === cookieCartId;
  }
}

/** Tính lại tổng tiền của cart */
async function recalcCart(cartId: string) {
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

/** PATCH /api/cart/items/[itemId] - Cập nhật số lượng */
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

    // Tìm cart item
    const existing = await prisma.cartItem.findUnique({
      where: { id: itemId },
      include: {
        product: { select: { price: true, stockOnHand: true, stockReserved: true } },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "ITEM_NOT_FOUND" }, { status: 404 });
    }

    // Kiểm tra quyền sở hữu
    const isOwner = await verifyCartItemOwnership(req, existing);
    if (!isOwner) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    // Xóa nếu quantity = 0
    if (quantity === 0) {
      await prisma.cartItem.delete({ where: { id: itemId } });
      await recalcCart(existing.cartId);
      return NextResponse.json({ ok: true, deleted: true });
    }

    // Kiểm tra stock
    if (existing.product) {
      const available = 
        (existing.product.stockOnHand ?? 0) - (existing.product.stockReserved ?? 0);
      
      if (quantity > available) {
        return NextResponse.json(
          { error: "INSUFFICIENT_STOCK", available },
          { status: 400 }
        );
      }
    }

    // Cập nhật
    const unitPrice =
      existing.product?.price != null
        ? Number(existing.product.price)
        : Number(existing.unitPrice);

    const lineTotal = unitPrice * quantity;

    const updated = await prisma.cartItem.update({
      where: { id: itemId },
      data: { quantity, unitPrice, lineTotal },
    });

    await recalcCart(existing.cartId);

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

/** DELETE /api/cart/items/[itemId] - Xóa item */
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ itemId: string }> }
) {
  try {
    const { itemId } = await context.params;

    const existing = await prisma.cartItem.findUnique({ where: { id: itemId } });

    if (!existing) {
      return NextResponse.json({ ok: true, deleted: true });
    }

    // Kiểm tra quyền sở hữu
    const isOwner = await verifyCartItemOwnership(req, existing);
    if (!isOwner) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    await prisma.cartItem.delete({ where: { id: itemId } });
    await recalcCart(existing.cartId);

    return NextResponse.json({ ok: true, deleted: true });
  } catch (e) {
    console.error("DELETE /api/cart/items/[itemId] error:", e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
