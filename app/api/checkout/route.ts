// app/api/checkout/route.ts
import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyRequestUser } from "@/lib/auth";
import { sendMail } from "@/lib/mailer";
import { generateOrderConfirmationEmail, generateNewOrderAdminEmail } from "@/lib/email-templates";
import { getDefaultTaxRate, getOrderNotificationEmail } from "@/lib/system-settings";
import type { Prisma } from "@/generated/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CART_COOKIE = "cart_id";

const PROMOS = {
  GIAM10: { kind: "percent", value: 10 },
  GIAM50K: { kind: "fixed", value: 50_000 },
  FREESHIP: { kind: "shipping_free" },
} as const;

function calcDiscount(code: string | null | undefined, subtotal: number): number {
  if (!code) return 0;
  const d = PROMOS[code.toUpperCase() as keyof typeof PROMOS];
  if (!d) return 0;
  if (d.kind === "percent") return (subtotal * d.value) / 100;
  if (d.kind === "fixed") return Math.min(subtotal, d.value);
  return 0;
}

function generateOrderCode() {
  const now = new Date();
  const y = now.getFullYear().toString().slice(-2);
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const rand = Math.floor(Math.random() * 9000) + 1000;
  return `AH${y}${m}${d}-${rand}`;
}

export async function POST(req: NextRequest) {
  try {
    const user = await verifyRequestUser(req).catch(() => null);

    const body = await req.json();
    const {
      guest,
      paymentType,
      paymentMethod,
      coupon,
      note,
      invoice,
      itemIds, // danh sách cartItem.id được chọn để checkout
    }: {
      guest: {
        fullName: string;
        email: string;
        phoneE164: string;
        taxCode?: string | null;

        line1: string;
        line2?: string;
        city: string;
        state?: string;
        postalCode?: string;
        country: string;
        note?: string;

        useSeparateBilling?: boolean;
        billingLine1?: string;
        billingLine2?: string;
        billingCity?: string;
        billingState?: string;
        billingPostalCode?: string;
        billingCountry?: string;
      };
      paymentType: "cod" | "bank" | "online";
      paymentMethod: string;
      coupon?: string | null;
      note?: string | null;
      invoice?: boolean;
      itemIds: string[];
    } = body;

    if (!Array.isArray(itemIds) || itemIds.length === 0) {
      return NextResponse.json(
        { ok: false, error: "Không có sản phẩm nào được chọn" },
        { status: 400 },
      );
    }

    // ====== Lấy cart ======
    let cart;

    if (user?.sub) {
      cart = await prisma.cart.findFirst({
        where: { userId: user.sub, status: "ACTIVE" },
        include: { cartitem: true },
      });
    } else {
      const cartId = req.cookies.get(CART_COOKIE)?.value;
      if (!cartId) {
        return NextResponse.json(
          { ok: false, error: "Không tìm thấy giỏ hàng" },
          { status: 400 },
        );
      }

      cart = await prisma.cart.findUnique({
        where: { id: cartId },
        include: { cartitem: true },
      });

      if (cart && cart.userId) {
        return NextResponse.json(
          { ok: false, error: "Giỏ hàng không hợp lệ" },
          { status: 400 },
        );
      }
    }

    if (!cart || cart.cartitem.length === 0) {
      return NextResponse.json(
        { ok: false, error: "Giỏ hàng trống" },
        { status: 400 },
      );
    }

    // ====== Lọc items theo itemIds ======
    const selectedItems = cart.cartitem.filter((it: (typeof cart.cartitem)[number]) => itemIds.includes(it.id));

    if (selectedItems.length === 0) {
      return NextResponse.json(
        { ok: false, error: "Không tìm thấy sản phẩm đã chọn" },
        { status: 400 },
      );
    }

    // ====== Tính tiền theo selected items ======
    const subtotal = selectedItems.reduce(
      (sum: number, item: (typeof selectedItems)[number]) => sum + Number(item.unitPrice) * item.quantity,
      0,
    );

    const discount = calcDiscount(coupon ?? null, subtotal);
    const taxable = Math.max(0, subtotal - discount);
    const taxRate = await getDefaultTaxRate();
    const vat = taxable * taxRate;

    const freeShip = coupon?.toUpperCase() === "FREESHIP";
    const shippingFee = freeShip ? 0 : 30_000;

    const grandTotal = taxable + vat + shippingFee;

    // ====== Shipping / Billing ======
    const shippingCountry = (guest.country || "VN").toUpperCase();

    let billingLine1: string | null = null;
    let billingLine2: string | null = null;
    let billingCity: string | null = null;
    let billingState: string | null = null;
    let billingPostalCode: string | null = null;
    let billingCountry: string = shippingCountry;

    if (invoice) {
      if (guest.useSeparateBilling) {
        billingLine1 = guest.billingLine1?.trim() || null;
        billingLine2 = guest.billingLine2?.trim() || null;
        billingCity = guest.billingCity?.trim() || null;
        billingState = guest.billingState?.trim() || null;
        billingPostalCode = guest.billingPostalCode?.trim() || null;
        billingCountry = (guest.billingCountry || shippingCountry).toUpperCase();
      } else {
        billingLine1 = guest.line1;
        billingLine2 = guest.line2?.trim() || null;
        billingCity = guest.city;
        billingState = guest.state?.trim() || null;
        billingPostalCode = guest.postalCode?.trim() || null;
      }
    }

    // ====== Tạo đơn hàng trong transaction ======
    const order = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const created = await tx.order.create({
        data: {
          id: randomUUID(),
          code: generateOrderCode(),
          status: "pending",

          customerFullName: guest.fullName,
          customerEmail: guest.email,
          customerPhone: guest.phoneE164,
          customerTaxCode: guest.taxCode || null,

          shippingLine1: guest.line1,
          shippingLine2: guest.line2 || null,
          shippingCity: guest.city,
          shippingState: guest.state || null,
          shippingPostalCode: guest.postalCode || null,
          shippingCountry,

          billingLine1,
          billingLine2,
          billingCity,
          billingState,
          billingPostalCode,
          billingCountry,

          shippingMethod:
            paymentType === "bank" ? "BANK_TRANSFER_QR" : paymentMethod,
          shippingFee,

          note: note || guest.note || null,

          subtotal,
          discountTotal: discount,
          taxTotal: vat,
          grandTotal,

          userId: user?.sub ?? null,
          updatedAt: new Date(),
        },
      });

      // ==== Order Items theo selected items ====
      await tx.orderitem.createMany({
        data: selectedItems.map((it: (typeof selectedItems)[number]) => ({
          id: randomUUID(),
          orderId: created.id,
          sku: it.productSku,
          name: it.productName,
          slug: it.productSlug,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          lineTotal: Number(it.unitPrice) * it.quantity,
          image: it.productImage,
          discount: 0,
        })),
      });

      // ==== Chỉ xoá những item đã chọn ====
      await tx.cartitem.deleteMany({
        where: { id: { in: itemIds } },
      });

      // ==== Nếu cart hết item thì CHECKOUT, nếu còn thì giữ ACTIVE ====
      const remaining = await tx.cartitem.count({ where: { cartId: cart.id } });

      await tx.cart.update({
        where: { id: cart.id },
        data: {
          status: remaining === 0 ? "CHECKOUT" : "ACTIVE",
          updatedAt: new Date(),
        },
      });

      return created;
    });

    // ====== Gửi mail xác nhận đơn (UPDATED) ======
    try {
      const orderData = {
        code: order.code,
        customerName: order.customerFullName,
        customerEmail: order.customerEmail!,
        items: selectedItems.map((it: (typeof selectedItems)[number]) => ({
          name: it.productName,
          sku: it.productSku,
          quantity: it.quantity,
          price: Number(it.unitPrice),
        })),
        subtotal,
        discount,
        vat,
        shippingFee,
        grandTotal,
      };

      // 1️⃣ Gửi email cho khách hàng
      const customerEmail = generateOrderConfirmationEmail(orderData);
      await sendMail({
        to: order.customerEmail!,
        subject: customerEmail.subject,
        text: customerEmail.text,
        html: customerEmail.html,
      });

      // 2️⃣ Gửi email thông báo cho admin
      const adminEmail = generateNewOrderAdminEmail(orderData);
      const adminNotificationEmail = await getOrderNotificationEmail();
      await sendMail({
        to: adminNotificationEmail,
        subject: adminEmail.subject,
        text: adminEmail.text,
        html: adminEmail.html,
      });

      console.log(`✅ Sent order emails for ${order.code}`);
    } catch (mailErr) {
      console.error("Send order confirmation mail failed:", mailErr);
      // không throw, để user vẫn đặt hàng được
    }

    // ====== Trả về preview để FE dùng cho trang checkout (QR) ======
    const orderPreview = {
      id: order.id,
      code: order.code,
      subtotal,
      discount,
      vat,
      taxRate,
      shippingFee,
      grandTotal,
      bankInfo: {
        bankId: "tpbank",
        accountName: "CÔNG TY TNHH AHSO",
        accountNumber: "03168969399",
        bankName: "TPBank – Chi nhánh Bình Chánh",
        transferNote: order.code,
      },
    };

    return NextResponse.json({ ok: true, orderPreview });
  } catch (err) {
    console.error("Checkout error:", err);
    return NextResponse.json(
      { ok: false, error: "Lỗi hệ thống" },
      { status: 500 },
    );
  }
}
