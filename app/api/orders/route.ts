// app/api/orders/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { toOrderListItemDTO } from "@/dto/order.mapper";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

type OrderWithItems = Prisma.OrderGetPayload<{
  include: { items: true };
}>;

export async function GET() {
  const rows: OrderWithItems[] = await prisma.order.findMany({
    include: { items: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const data = rows.map((r) =>
    toOrderListItemDTO(
      {
        id: r.id,
        code: r.code,
        createdAt: r.createdAt,
        status: r.status,
        customerName: r.customerFullName,
        shippingMethod: r.shippingMethod ?? undefined,
        shippingFee: r.shippingFee ? Number(r.shippingFee) : 0,

        // 👇 thêm 4 field
        subtotal: r.subtotal ? Number(r.subtotal) : undefined,
        discountTotal: r.discountTotal ? Number(r.discountTotal) : undefined,
        taxTotal: r.taxTotal ? Number(r.taxTotal) : undefined,
        grandTotal: r.grandTotal ? Number(r.grandTotal) : undefined,

        note: r.note ?? undefined,
      },
      r.items.map((it) => ({
        sku: it.sku,
        name: it.name,
        quantity: it.quantity,
        price: Number(it.unitPrice),
        image: it.image ?? null,
      })),
    ),
  );

  return NextResponse.json(data);
}
