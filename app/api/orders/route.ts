// app/api/orders/route.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { toOrderListItemDTO } from "@/dto/order.mapper";
import type { orderGetPayload } from "@/lib/prisma-types";
import { verifyRequestUser } from "@/lib/auth";
import type { order_status } from "@prisma/client";

export const dynamic = "force-dynamic";

type OrderWithItems = orderGetPayload<{
  include: { orderitem: true };
}>;

const ORDER_STATUSES: order_status[] = [
  "pending",
  "paid",
  "processing",
  "shipped",
  "delivered",
  "cancel_requested",
  "cancelled",
];

export async function GET(req: NextRequest) {
  const user = await verifyRequestUser(req);
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  const statusParam = (searchParams.get("status") || "").trim();
  const status = ORDER_STATUSES.includes(statusParam as order_status)
    ? (statusParam as order_status)
    : null;

  const rows: OrderWithItems[] = await prisma.order.findMany({
    where: {
      userId: user.sub,
      ...(q && {
        OR: [
          { code: { contains: q } },
          { customerFullName: { contains: q } },
          { customerEmail: { contains: q } },
          { customerPhone: { contains: q } },
        ],
      }),
      ...(status && { status }),
    },
    include: { orderitem: true },
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
      r.orderitem.map((it: (typeof r.orderitem)[number]) => ({
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
