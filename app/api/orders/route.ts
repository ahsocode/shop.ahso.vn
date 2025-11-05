// app/api/orders/route.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { toOrderListItemDTO } from "@/dto/order.mapper";


export const dynamic = "force-dynamic";

// context param ở route này không cần dùng; chữ ký (req: NextRequest) tương thích với validator
export async function GET(_req: NextRequest) {
  const rows = await prisma.order.findMany({
    include: { items: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const data = rows.map(
    (r: {
      id: string;
      code: string;
      createdAt: Date;
      status: string;
      customerName: string;
      shippingMethod: string | null;
      shippingFee: number | null;
      note: string | null;
      items: Array<{ sku: string; name: string; quantity: number; price: number; image: string | null }>;
    }) =>
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
        r.items.map((it) => ({
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
