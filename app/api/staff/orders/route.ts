import type { NextRequest } from "next/server";
import type { Prisma, OrderStatus, PaymentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { verifyBearerAuth, requireRole } from "@/lib/auth";
import { jsonError, jsonOk, parsePaging, toHttpError } from "@/lib/http";

export const dynamic = "force-dynamic";

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

    const where: Prisma.OrderWhereInput = {};

    if (q) {
      where.OR = [
        { code: { contains: q } },
        { customerFullName: { contains: q } },
        { customerEmail: { contains: q } },
        { customerPhone: { contains: q } },
      ];
    }

    if (statusParam && ORDER_STATUSES.includes(statusParam as OrderStatus)) {
      where.status = statusParam as OrderStatus;
    }

    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = from;
      if (to) {
        // add end-of-day
        const toEnd = new Date(to);
        toEnd.setHours(23, 59, 59, 999);
        where.createdAt.lte = toEnd;
      }
    }

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

    const data: StaffListItem[] = rows.map((order) => {
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
    stats.forEach((row) => {
      const countValue =
        typeof row._count === "object"
          ? row._count?.status
          : row._count === true
            ? 1
            : row._count;
      statsMap[row.status] = typeof countValue === "number" ? countValue : 0;
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
