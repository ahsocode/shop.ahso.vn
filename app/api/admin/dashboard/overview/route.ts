import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyBearerAuth, requireRole } from "@/lib/auth";
import { jsonOk, jsonError, toHttpError } from "@/lib/http";
import { getFinancialOverview } from "@/lib/stock-finance-service";

export const dynamic = "force-dynamic";

function resolvePeriod(period: string | null) {
  const value = period || "month";
  let startDate: Date | undefined;
  let endDate: Date | undefined;

  const now = new Date();
  now.setHours(23, 59, 59, 999);

  switch (value) {
    case "day":
      startDate = new Date(now);
      startDate.setHours(0, 0, 0, 0);
      endDate = now;
      break;
    case "week":
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 7);
      startDate.setHours(0, 0, 0, 0);
      endDate = now;
      break;
    case "month":
      startDate = new Date(now);
      startDate.setDate(1);
      startDate.setHours(0, 0, 0, 0);
      endDate = now;
      break;
    case "year":
      startDate = new Date(now.getFullYear(), 0, 1);
      endDate = now;
      break;
    case "custom":
      return { period: value, startDate, endDate };
    default:
      return { period: value, startDate, endDate };
  }

  return { period: value, startDate, endDate };
}

export async function GET(req: NextRequest) {
  try {
    const me = await verifyBearerAuth(req);
    requireRole(me, ["ADMIN"]);

    const { searchParams } = new URL(req.url);
    const { period, startDate, endDate } = resolvePeriod(searchParams.get("period"));
    const limitParam = Number(searchParams.get("limit"));
    const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 50) : 10;

    const [overview, transactions] = await Promise.all([
      getFinancialOverview(startDate, endDate),
      prisma.financialtransaction.findMany({
        orderBy: { createdAt: "desc" },
        take: limit,
        select: {
          id: true,
          code: true,
          type: true,
          amount: true,
          profitAmount: true,
          orderCode: true,
          createdAt: true,
          order: { select: { customerFullName: true } },
        },
      }),
    ]);

    const txData = transactions.map((tx) => ({
      id: tx.id,
      code: tx.code,
      type: tx.type,
      amount: Number(tx.amount),
      profitAmount: Number(tx.profitAmount),
      orderCode: tx.orderCode,
      customerName: tx.order?.customerFullName ?? null,
      createdAt: tx.createdAt.toISOString(),
    }));

    return jsonOk({
      period,
      startDate: startDate?.toISOString(),
      endDate: endDate?.toISOString(),
      stats: {
        revenue: overview.revenue,
        netProfit: overview.netProfit,
        summary: overview.summary,
      },
      transactions: txData,
    });
  } catch (err) {
    const httpError = toHttpError(err);
    return jsonError(httpError.message ?? "Internal Server Error", httpError.status ?? 500);
  }
}
