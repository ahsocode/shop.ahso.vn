import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyBearerAuth, requireRole } from "@/lib/auth";
import { jsonError, jsonOk, parsePaging, toHttpError } from "@/lib/http";
import type { order_status, payment_status } from "@/generated/enums";
import type { orderWhereInput } from "@/lib/prisma-types";

export const dynamic = "force-dynamic";

type OrderStatus = order_status;
type PaymentStatus = payment_status;
const ORDER_STATUSES: OrderStatus[] = ["pending", "paid", "processing", "shipped", "delivered", "cancelled"];

function parseDate(value?: string | null) {
  if (!value) return undefined;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

type StaffListItem = {
  id: string;
  code: string;
  createdAt: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus | null;
  paymentMethod: string | null;
  total: number;
};

export async function GET(req: NextRequest) {
  try {
    const me = await verifyBearerAuth(req);
    requireRole(me, ["STAFF", "ADMIN"]);

    const url = new URL(req.url);
    const q = (url.searchParams.get("q") || "").trim();
    const statusParam = (url.searchParams.get("status") || "").trim();
    const from = parseDate(url.searchParams.get("from"));
    const to = parseDate(url.searchParams.get("to"));
    const { page, pageSize, skip, take } = parsePaging(req, {
      defaultPageSize: 15,
      maxPageSize: 50,
    });

    const toEndOfDay = to ? new Date(to) : undefined;
    if (toEndOfDay) {
      toEndOfDay.setHours(23, 59, 59, 999);
    }

    const where: orderWhereInput = {
      ...(q && {
        OR: [
          { code: { contains: q } },
          { customerFullName: { contains: q } },
          { customerEmail: { contains: q } },
          { customerPhone: { contains: q } },
        ],
      }),
      ...(statusParam && ORDER_STATUSES.includes(statusParam as OrderStatus) && {
        status: statusParam as OrderStatus,
      }),
      ...((from || toEndOfDay) && {
        createdAt: {
          ...(from && { gte: from }),
          ...(toEndOfDay && { lte: toEndOfDay }),
        },
      }),
    };

    const [total, rows, stats] = await prisma.$transaction([
      prisma.order.count({ where }),
      prisma.order.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take,
        select: {
          id: true,
          code: true,
          createdAt: true,
          status: true,
          customerFullName: true,
          customerEmail: true,
          customerPhone: true,
          grandTotal: true,
          subtotal: true,
          shippingFee: true,
          payment: {
            select: {
              status: true,
              method: true,
            },
          },
        },
      }),
      prisma.order.groupBy({
        by: ["status"],
        _count: { status: true },
        where,
        orderBy: { status: "asc" },
      }),
    ]);

    const data: StaffListItem[] = rows.map((order: (typeof rows)[number]) => {
      const grandTotal = order.grandTotal ? Number(order.grandTotal) : null;
      const subtotal = order.subtotal ? Number(order.subtotal) : 0;
      const shippingFee = order.shippingFee ? Number(order.shippingFee) : 0;

      return {
        id: order.id,
        code: order.code,
        createdAt: order.createdAt.toISOString(),
        customerName: order.customerFullName,
        customerEmail: order.customerEmail,
        customerPhone: order.customerPhone,
        status: order.status,
        paymentStatus: order.payment?.status ?? null,
        paymentMethod: order.payment?.method ?? null,
        total: grandTotal ?? subtotal + shippingFee,
      };
    });

    const statsMap: Record<OrderStatus, number> = {
      pending: 0,
      paid: 0,
      processing: 0,
      shipped: 0,
      delivered: 0,
      cancelled: 0,
    };
    stats.forEach((row: (typeof stats)[number]) => {
      const countValue =
        typeof row._count === "object"
          ? row._count?.status
          : row._count === true
            ? 1
            : row._count;
      const status = row.status as OrderStatus;
      statsMap[status] = typeof countValue === "number" ? countValue : 0;
    });

    return jsonOk({
      data,
      meta: {
        page,
        pageSize,
        total,
      },
      stats: statsMap,
      filters: {
        q,
        status: (where.status as OrderStatus | undefined) ?? null,
        from: from?.toISOString() ?? null,
        to: to?.toISOString() ?? null,
      },
    });
  } catch (err: unknown) {
    const httpError = toHttpError(err);
    return jsonError(httpError.message ?? "Internal Server Error", httpError.status ?? 500);
  }
}
