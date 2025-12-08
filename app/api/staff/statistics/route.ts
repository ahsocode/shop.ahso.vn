import type { NextRequest } from "next/server";
import { verifyBearerAuth, requireRole } from "@/lib/auth";
import { jsonError, jsonOk, toHttpError } from "@/lib/http";
import { getFinancialOverview } from "@/lib/stock-finance-service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const me = await verifyBearerAuth(req);
    requireRole(me, ["STAFF", "ADMIN"]);

    const { searchParams } = new URL(req.url);
    const period = searchParams.get("period") || "month"; // day, week, month, year, custom

    let startDate: Date | undefined;
    let endDate: Date | undefined;

    const now = new Date();
    now.setHours(23, 59, 59, 999);

    switch (period) {
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
      case "custom": {
        const from = searchParams.get("from");
        const to = searchParams.get("to");
        if (from) startDate = new Date(from);
        if (to) {
          endDate = new Date(to);
          endDate.setHours(23, 59, 59, 999);
        }
        break;
      }
      default:
        break;
    }

    const overview = await getFinancialOverview(startDate, endDate);

    return jsonOk({
      period,
      startDate: startDate?.toISOString(),
      endDate: endDate?.toISOString(),
      ...overview,
    });
  } catch (err: unknown) {
    const httpError = toHttpError(err);
    return jsonError(httpError.message ?? "Internal Server Error", httpError.status ?? 500);
  }
}
