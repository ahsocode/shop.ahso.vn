// app/api/orders/[id]/route.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyRequestUser } from "@/lib/auth";
import { toOrderDetailDTO } from "@/dto/order.mapper";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

type OrderWithRelations = Prisma.OrderGetPayload<{
  include: { items: true; payment: true; address: true };
}>;

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  // bắt buộc đăng nhập, guest sẽ bị chặn trong verifyRequestUser (tuỳ implement của bạn)
  const user = await verifyRequestUser(req);

  const r: OrderWithRelations | null = await prisma.order.findUnique({
    where: { id },
    include: { items: true, payment: true, address: true },
  });

  if (!r) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  const isOwner = user && r.userId && r.userId === user.sub;
  const isStaff = user && (user.role === "STAFF" || user.role === "ADMIN");

  if (!isOwner && !isStaff) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  // Chuẩn hoá dữ liệu đưa vào mapper
  const dto = toOrderDetailDTO({
    order: {
      id: r.id,
      code: r.code,
      createdAt: r.createdAt,
      status: r.status,
      customerName: r.customerFullName,
      customerEmail: r.customerEmail,
      customerPhone: r.customerPhone,
      shippingMethod: r.shippingMethod,
      shippingFee: r.shippingFee ? Number(r.shippingFee) : 0,
      note: r.note,
      subtotal: Number(r.subtotal),
      discountTotal: Number(r.discountTotal),
      taxTotal: Number(r.taxTotal),
      grandTotal: Number(r.grandTotal),
    },
    items: r.items.map((it) => ({
      sku: it.sku,
      name: it.name,
      quantity: it.quantity,
      price: Number(it.unitPrice),
      image: it.image ?? null,
    })),
    // ✅ LẤY TỪ CÁC CỘT shippingLine1, shippingCity, shippingState,...
    address: r.shippingLine1
      ? {
          line1: r.shippingLine1,
          line2: r.shippingLine2 ?? undefined,
          city: r.shippingCity,
          state: r.shippingState ?? undefined,
          province: undefined, // nếu sau này có cột province thì map thêm
        }
      : null,
    payment: r.payment
      ? {
          method: r.payment.method,
          amount: Number(r.payment.amount),
        }
      : null,
  });

  return NextResponse.json(dto);
}
