// app/api/profile/orders/route.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import type { orderGetPayload } from "@/lib/prisma-types";

import { verifyRequestUser } from "../../../../lib/auth";
import { toOrderListItemDTO } from "@/dto/order.mapper";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const user = await verifyRequestUser(req);
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const rows = await prisma.order.findMany({
    where: { userId: user.sub },
    include: { orderitem: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  type OrderWithItems = orderGetPayload<{ include: { orderitem: true } }>;
  const data = rows.map((r: OrderWithItems) =>
    toOrderListItemDTO(
      {
        id: r.id,
        code: r.code,
        createdAt: r.createdAt,
        status: r.status,
        customerName: r.customerFullName ?? "Khách hàng",
        shippingMethod: r.shippingMethod ?? undefined,
        shippingFee: r.shippingFee ? Number(r.shippingFee) : undefined,
        note: r.note ?? undefined,
      },
      r.orderitem.map((it: (typeof r.orderitem)[number]) => ({
        sku: it.sku,
        name: it.name,
        quantity: it.quantity,
        price: Number(it.unitPrice ?? 0),
        image: it.image ?? null,
      }))
    )
  );

  return NextResponse.json(data);
}
