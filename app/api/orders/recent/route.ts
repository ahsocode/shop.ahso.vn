// app/api/orders/recent/route.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import type { Prisma, OrderStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { verifyRequestUser } from "@/lib/auth";
import { toOrderListItemDTO } from "@/dto/order.mapper";

export const dynamic = "force-dynamic";

type OrderWithItems = Prisma.OrderGetPayload<{
  include: { items: true };
}>;

export async function GET(req: NextRequest) {
  const user = await verifyRequestUser(req);
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);

  // cho phép truyền ?limit=2, default = 3
  const limitParam = parseInt(searchParams.get("limit") || "3", 10);
  const take = Math.min(5, Math.max(1, limitParam || 3));

  const where: Prisma.OrderWhereInput = {
    userId: user.sub,
    // loại trừ đã giao (hoàn thành) + đã huỷ
    status: {
      notIn: ["cancelled", "delivered"] as OrderStatus[],
    },
  };

  const rows: OrderWithItems[] = await prisma.order.findMany({
    where,
    include: { items: true },
    orderBy: { createdAt: "desc" },
    take,
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
