// app/api/cart/items/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { verifyRequestUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const CART_COOKIE = "cart_id";
const COOKIE_OPTS = {
  httpOnly: true as const,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 24 * 30,
};

type TotItem = { quantity: number; unitPrice: Prisma.Decimal | number | string | null };

function calcTotals(items: TotItem[]) {
  const subtotal = items.reduce((s, it) => s + Number(it.unitPrice ?? 0) * it.quantity, 0);
  const discountTotal = 0;
  const taxTotal = 0;
  const shippingFee = 0;
  const grandTotal = subtotal - discountTotal + taxTotal + shippingFee;
  return { subtotal, discountTotal, taxTotal, shippingFee, grandTotal };
}

/**
 * Lấy/tạo cart cho user đã đăng nhập
 */
async function getOrCreateUserCart(userId: string) {
  let cart = await prisma.cart.findFirst({
    where: { userId, status: "ACTIVE" },
  });

  if (!cart) {
    cart = await prisma.cart.create({
      data: { userId, status: "ACTIVE" },
    });
  }

  return { cart, created: false };
}

/**
 * Lấy/tạo cart cho guest
 */
async function getOrCreateGuestCart(cookieId: string | null) {
  if (cookieId) {
    const found = await prisma.cart.findUnique({ where: { id: cookieId } });
    // Chỉ dùng nếu cart không thuộc user nào
    if (found && !found.userId) {
      return { cart: found, created: false };
    }
  }

  const created = await prisma.cart.create({
    data: { status: "ACTIVE", userId: null },
  });

  return { cart: created, created: true };
}

/** POST /api/cart/items - Thêm sản phẩm vào giỏ */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const sku = String(body?.sku ?? "").trim();
    const quantity = Math.max(1, Number(body?.qty ?? body?.quantity ?? 1));

    if (!sku) {
      return NextResponse.json({ error: "MISSING_SKU" }, { status: 400 });
    }

    // Kiểm tra user
    const user = await verifyRequestUser(req);
    let cart;
    let created = false;

    if (user?.sub) {
      // USER ĐÃ ĐĂNG NHẬP
      const result = await getOrCreateUserCart(user.sub);
      cart = result.cart;
      created = result.created;
    } else {
      // GUEST
      const cookieId = req.cookies.get(CART_COOKIE)?.value || null;
      const result = await getOrCreateGuestCart(cookieId);
      cart = result.cart;
      created = result.created;
    }

    // Tìm product
    const product = await prisma.product.findUnique({
      where: { sku },
    });

    if (!product) {
      return NextResponse.json({ error: "PRODUCT_NOT_FOUND" }, { status: 404 });
    }

    // Kiểm tra stock
    const availableStock = (product.stockOnHand ?? 0) - (product.stockReserved ?? 0);
    if (availableStock < quantity) {
      return NextResponse.json(
        { error: "INSUFFICIENT_STOCK", available: availableStock },
        { status: 400 }
      );
    }

    // Kiểm tra item đã có trong cart chưa
    const existing = await prisma.cartItem.findFirst({
      where: { cartId: cart.id, productId: product.id },
    });

    const unitPrice = product.price;

    if (existing) {
      // Tăng số lượng
      const newQty = existing.quantity + quantity;
      
      // Kiểm tra stock cho số lượng mới
      if (availableStock < newQty) {
        return NextResponse.json(
          { error: "INSUFFICIENT_STOCK", available: availableStock },
          { status: 400 }
        );
      }

      await prisma.cartItem.update({
        where: { id: existing.id },
        data: {
          quantity: newQty,
          unitPrice,
          lineTotal: Number(unitPrice) * newQty,
        },
      });
    } else {
      // Tạo mới
      await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId: product.id,
          productName: product.name,
          productSku: product.sku,
          productSlug: product.slug,
          productImage: product.coverImage ?? null,
          unitLabel: null,
          quantityLabel: product.quantityLabel ?? null,
          unitPrice,
          currency: product.currency,
          taxIncluded: product.taxIncluded,
          quantity,
          lineTotal: Number(unitPrice) * quantity,
        },
      });
    }

    // Cập nhật tổng tiền
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

    // Lấy cart đầy đủ
    const full = await prisma.cart.findUnique({
      where: { id: cart.id },
      include: { items: true },
    });

    const res = NextResponse.json(full, { status: 201 });

    // Set cookie cho guest nếu cart mới
    if (!user?.sub && created) {
      res.cookies.set(CART_COOKIE, cart.id, COOKIE_OPTS);
    }

    // Clear cookie cho logged-in user
    if (user?.sub) {
      res.cookies.delete(CART_COOKIE);
    }

    return res;
  } catch (e) {
    console.error("POST /api/cart/items error:", e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
