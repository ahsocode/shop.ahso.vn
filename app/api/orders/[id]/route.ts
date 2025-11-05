// app/api/orders/[id]/route.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

import { verifyRequestUser } from "../../../../lib/auth";
import { toOrderDetailDTO } from "@/dto/order.mapper";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const user = await verifyRequestUser(_req); // có thể null (khách chưa đăng nhập)

  const r = await prisma.order.findUnique({
    where: { id },
    include: { items: true, payment: true, address: true },
  });

  if (!r) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  // Quyền: chủ đơn hoặc staff/admin
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
      customerName: r.customerName,
      shippingMethod: r.shippingMethod,
      shippingFee: r.shippingFee,
      note: r.note,
    },
    items: r.items.map((it: { sku: string; name: string; quantity: number; price: number; image: string | null }) => ({
      sku: it.sku,
      name: it.name,
      quantity: it.quantity,
      price: it.price,
      image: it.image ?? null,
    })),
    address: r.address
      ? {
          line1: r.address.line1,
          line2: r.address.line2 ?? undefined,
          city: r.address.city,
          state: r.address.state ?? undefined, // mapper tự map state -> district
        }
      : null,
    payment: r.payment
      ? {
          method: r.payment.method,
          amount: r.payment.amount,
        }
      : null,
  });

  return NextResponse.json(dto);
}
