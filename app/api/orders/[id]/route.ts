// app/api/orders/[id]/route.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyRequestUser } from "@/lib/auth";
import { toOrderDetailDTO } from "@/dto/order.mapper";
import type { orderGetPayload } from "@/lib/prisma-types";
import type { OrderDetailDTO } from "@/dto/order.dto";

export const dynamic = "force-dynamic";

type OrderWithRelations = orderGetPayload<{
  include: { orderitem: true; payment: true; address: true };
}>;

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  // bắt buộc đăng nhập
  const user = await verifyRequestUser(req);

  const r: OrderWithRelations | null = await prisma.order.findUnique({
    where: { id },
    include: { orderitem: true, payment: true, address: true },
  });

  if (!r) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  const isOwner = user && r.userId && r.userId === user.sub;
  const isStaff = user && (user.role === "STAFF" || user.role === "ADMIN");

  if (!isOwner && !isStaff) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

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

      // ✅ thêm 2 field mới
      cancelRequestReason: r.cancelRequestReason ?? null,
      cancelReason: r.cancelReason ?? null,
      cancelRejectReason: r.cancelRejectReason ?? null,
      cancelRejectAt: r.cancelRejectAt ?? null,
      prevStatusBeforeCancel: r.prevStatusBeforeCancel ?? null,
    },
    items: r.orderitem.map((it: (typeof r.orderitem)[number]) => ({
      sku: it.sku,
      name: it.name,
      quantity: it.quantity,
      price: Number(it.unitPrice),
      image: it.image ?? null,
    })),
    // ✅ map đúng shape AddressEntityMinimal
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

  // Nếu là staff/admin thì trả thêm lịch sử trạng thái kèm tên người thao tác
  if (isStaff) {
    const history = await prisma.orderstatushistory.findMany({
      where: { orderId: id },
      orderBy: { createdAt: "asc" },
    });

    const userIds = Array.from(
      new Set(history.map((h) => h.createdBy).filter((v): v is string => Boolean(v))),
    );

    const users = userIds.length
      ? await prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, fullName: true, role: true },
        })
      : [];

    const userMap = new Map(users.map((u) => [u.id, u]));

    (dto as OrderDetailDTO).history = history.map((h) => {
      const userInfo = h.createdBy ? userMap.get(h.createdBy) : undefined;
      return {
        id: h.id,
        fromStatus: (h.fromStatus as OrderDetailDTO["status"] | null) ?? null,
        toStatus: h.toStatus as OrderDetailDTO["status"],
        reason: h.reason ?? null,
        createdAt: h.createdAt.toISOString(),
        createdBy: h.createdBy ?? null,
        createdByName: userInfo?.fullName ?? null,
        createdByRole: userInfo?.role ?? null,
      };
    });
  }

  return NextResponse.json(dto);
}
