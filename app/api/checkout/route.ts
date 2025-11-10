import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const CART_COOKIE = "cart_id";
const VAT_RATE = 0.1;
const SHIPPING_FLAT = 30000;

// Demo promos — giữ đúng với UI
const PROMOS: Record<
  string,
  | { kind: "percent"; value: number }
  | { kind: "fixed"; value: number }
  | { kind: "shipping_free" }
> = {
  GIAM10: { kind: "percent", value: 10 },
  GIAM50K: { kind: "fixed", value: 50000 },
  FREESHIP: { kind: "shipping_free" },
};

type GuestInfo = {
  fullName: string;
  email: string;
  phoneE164: string;
  taxCode?: string;
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  postalCode?: string;
  country: string;
  note?: string;
};

function getCartIdFromReq(req: NextRequest): string | null {
  return req.cookies.get(CART_COOKIE)?.value ?? null;
}

function isValidEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}
function isValidPhoneE164(v: string) {
  return /^\+?\d{8,15}$/.test(v);
}
function isValidTaxCode(v?: string) {
  if (!v) return true;
  return /^\d{10,13}$/.test(v);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      guest,
      paymentType,
      paymentMethod,
      coupon,
      note,
    }: {
      guest: GuestInfo;
      paymentType: "cod" | "bank" | "online";
      paymentMethod?: string;
      coupon?: string;
      note?: string;
    } = body ?? {};

    // 1) Lấy giỏ theo cookie (guest OK)
    const cartId = getCartIdFromReq(req);
    if (!cartId) {
      return NextResponse.json({ error: "CART_NOT_FOUND" }, { status: 400 });
    }

    const cart = await prisma.cart.findUnique({
      where: { id: cartId },
      include: {
        items: {
          include: {
            product: {
              select: { name: true, slug: true, price: true, stockOnHand: true, currency: true },
            },
          },
        },
      },
    });

    if (!cart || cart.items.length === 0) {
      return NextResponse.json({ error: "CART_EMPTY" }, { status: 400 });
    }

    // 2) Validate guest info (nếu chưa login)
    if (!guest || !guest.fullName || !guest.email || !guest.phoneE164 || !guest.line1 || !guest.city) {
      return NextResponse.json({ error: "MISSING_GUEST_INFO" }, { status: 400 });
    }
    if (!isValidEmail(guest.email)) {
      return NextResponse.json({ error: "INVALID_EMAIL" }, { status: 400 });
    }
    if (!isValidPhoneE164(guest.phoneE164)) {
      return NextResponse.json({ error: "INVALID_PHONE" }, { status: 400 });
    }
    if (!isValidTaxCode(guest.taxCode)) {
      return NextResponse.json({ error: "INVALID_TAXCODE" }, { status: 400 });
    }

    // 3) Kiểm tra tồn kho (nếu có)
    for (const it of cart.items) {
      if (typeof it.product?.stockOnHand === "number" && it.quantity > it.product.stockOnHand) {
        return NextResponse.json(
          { error: "INSUFFICIENT_STOCK", itemId: it.id, available: it.product.stockOnHand ?? 0 },
          { status: 400 }
        );
      }
    }

    // 4) Tính tiền
    const subtotal = cart.items.reduce((s, it) => s + Number(it.unitPrice) * it.quantity, 0);

    let discount = 0;
    let shippingFee = SHIPPING_FLAT;
    const code = (coupon || "").trim().toUpperCase();
    if (code && PROMOS[code]) {
      const d = PROMOS[code];
      if (d.kind === "percent") discount = (subtotal * d.value) / 100;
      if (d.kind === "fixed") discount = Math.min(subtotal, d.value);
      if (d.kind === "shipping_free") shippingFee = 0;
    }

    const taxable = Math.max(0, subtotal - discount);
    const vat = taxable * VAT_RATE;
    const grandTotal = taxable + vat + shippingFee;

    // 5) (TÙY BẠN) Ghi Order/OrderItem vào DB
    //    => Giữ dưới dạng "TODO" để không đụng vào schema của bạn nếu khác tên.
    //    Ví dụ (pseudo):
    // const order = await prisma.order.create({
    //   data: {
    //     status: "PENDING",
    //     paymentType,
    //     paymentMethod: paymentMethod ?? null,
    //     note: note ?? null,
    //     guestName: guest.fullName,
    //     guestEmail: guest.email,
    //     guestPhone: guest.phoneE164,
    //     shippingAddressLine1: guest.line1,
    //     shippingAddressLine2: guest.line2 ?? null,
    //     shippingCity: guest.city,
    //     shippingState: guest.state ?? null,
    //     shippingPostalCode: guest.postalCode ?? null,
    //     shippingCountry: guest.country ?? "VN",
    //     subtotal,
    //     discountTotal: discount,
    //     taxTotal: vat,
    //     shippingFee,
    //     grandTotal,
    //     items: {
    //       create: cart.items.map((it) => ({
    //         productId: it.productId,
    //         productName: it.productName,
    //         productSku: it.productSku,
    //         quantity: it.quantity,
    //         unitPrice: it.unitPrice,
    //         lineTotal: Number(it.unitPrice) * it.quantity,
    //       })),
    //     },
    //   },
    // });

    // 6) (khuyến nghị) Xoá/đổi trạng thái giỏ:
    // await prisma.cart.update({ where: { id: cartId }, data: { status: "CHECKED_OUT" } });

    // 7) Trả preview + success
    return NextResponse.json({
      ok: true,
      orderPreview: {
        // id: order.id, // khi bạn bật phần tạo order thật
        paymentType,
        paymentMethod: paymentMethod ?? null,
        coupon: code || null,
        guest,
        items: cart.items.map((it) => ({
          id: it.id,
          name: it.productName,
          sku: it.productSku,
          slug: it.product?.slug ?? it.productSlug,
          qty: it.quantity,
          price: Number(it.unitPrice),
          image: it.productImage,
        })),
        totals: {
          subtotal,
          discount,
          vat,
          shippingFee,
          grandTotal,
          currency: cart.items[0]?.product?.currency ?? "VND",
        },
        note: note ?? null,
      },
    });
  } catch (e) {
    console.error("POST /api/checkout error:", e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
