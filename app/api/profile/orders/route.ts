// app/api/profile/orders/route.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

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
    include: { items: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const data = rows.map((r: any) =>
    toOrderListItemDTO(
      {
        id: r.id,
        code: r.code,
        createdAt: r.createdAt,
        status: r.status,
        customerName: r.customerName,
        shippingMethod: r.shippingMethod ?? undefined,
        shippingFee: r.shippingFee ?? undefined,
        note: r.note ?? undefined,
      },
      r.items.map((it: any) => ({
        sku: it.sku,
        name: it.name,
        quantity: it.quantity,
        price: it.price,
        image: it.image ?? null,
      }))
    )
  );

  return NextResponse.json(data);
}
