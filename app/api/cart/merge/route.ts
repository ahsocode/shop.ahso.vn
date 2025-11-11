// app/api/cart/merge/route.ts
/**
 * POST /api/cart/merge
 * Gộp cart guest (từ cookie) vào cart của user đã đăng nhập
 * Gọi sau khi user login thành công
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyBearerAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

const CART_COOKIE = "cart_id";

type TotItem = { quantity: number; unitPrice: any };

function calcTotals(items: TotItem[]) {
  const subtotal = items.reduce((s, it) => s + Number(it.unitPrice) * it.quantity, 0);
  const discountTotal = 0;
  const taxTotal = 0;
  const shippingFee = 0;
  const grandTotal = subtotal - discountTotal + taxTotal + shippingFee;
  return { subtotal, discountTotal, taxTotal, shippingFee, grandTotal };
}

export async function POST(req: NextRequest) {
  try {
    // Bắt buộc phải đăng nhập
    const user = await verifyBearerAuth(req);
    const userId = user.sub;

    // Lấy guest cart từ cookie
    const guestCartId = req.cookies.get(CART_COOKIE)?.value;
    
    if (!guestCartId) {
      return NextResponse.json({ message: "No guest cart to merge" });
    }

    const guestCart = await prisma.cart.findUnique({
      where: { id: guestCartId },
      include: { items: true },
    });

    // Guest cart không tồn tại hoặc đã thuộc user khác
    if (!guestCart || guestCart.userId) {
      return NextResponse.json({ message: "Guest cart invalid or already merged" });
    }

    // Tìm hoặc tạo user cart
    let userCart = await prisma.cart.findFirst({
      where: { userId, status: "ACTIVE" },
      include: { items: true },
    });

    if (!userCart) {
      userCart = await prisma.cart.create({
        data: { userId, status: "ACTIVE" },
        include: { items: true },
      });
    }

    // Gộp items từ guest cart vào user cart
    for (const guestItem of guestCart.items) {
      const existingUserItem = userCart.items.find(
        (ui) => ui.productId === guestItem.productId
      );

      if (existingUserItem) {
        // Tăng số lượng
        const newQty = existingUserItem.quantity + guestItem.quantity;
        await prisma.cartItem.update({
          where: { id: existingUserItem.id },
          data: {
            quantity: newQty,
            lineTotal: Number(existingUserItem.unitPrice) * newQty,
          },
        });
      } else {
        // Tạo mới trong user cart
        await prisma.cartItem.create({
          data: {
            cartId: userCart.id,
            productId: guestItem.productId,
            productName: guestItem.productName,
            productSku: guestItem.productSku,
            productSlug: guestItem.productSlug,
            productImage: guestItem.productImage,
            brandName: guestItem.brandName,
            unitLabel: guestItem.unitLabel,
            quantityLabel: guestItem.quantityLabel,
            unitPrice: guestItem.unitPrice,
            currency: guestItem.currency,
            taxIncluded: guestItem.taxIncluded,
            quantity: guestItem.quantity,
            lineTotal: guestItem.lineTotal,
          },
        });
      }
    }

    // Tính lại tổng cho user cart
    const updatedItems = await prisma.cartItem.findMany({
      where: { cartId: userCart.id },
    });
    const totals = calcTotals(updatedItems);

    await prisma.cart.update({
      where: { id: userCart.id },
      data: {
        subtotal: totals.subtotal,
        discountTotal: totals.discountTotal,
        taxTotal: totals.taxTotal,
        shippingFee: totals.shippingFee,
        grandTotal: totals.grandTotal,
      },
    });

    // Xóa guest cart
    await prisma.cart.delete({ where: { id: guestCartId } });

    // Trả về user cart đã merge
    const finalCart = await prisma.cart.findUnique({
      where: { id: userCart.id },
      include: { items: true },
    });

    const res = NextResponse.json({
      message: "Cart merged successfully",
      cart: finalCart,
    });

    // Clear cookie
    res.cookies.delete(CART_COOKIE);

    return res;
  } catch (error) {
    console.error("POST /api/cart/merge error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}