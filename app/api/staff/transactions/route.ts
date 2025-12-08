import type { NextRequest } from "next/server";
import { verifyBearerAuth, requireRole } from "@/lib/auth";
import { jsonError, jsonOk, toHttpError, parsePaging } from "@/lib/http";
import { getFinancialTransactions } from "@/lib/stock-finance-service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const me = await verifyBearerAuth(req);
    requireRole(me, ["STAFF", "ADMIN"]);

    const { searchParams } = new URL(req.url);
    const { page, pageSize } = parsePaging(req);

    const type = searchParams.get("type") || undefined;
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const startDate = from ? new Date(from) : undefined;
    const endDate = to ? new Date(to) : undefined;
    if (endDate) endDate.setHours(23, 59, 59, 999);

    const result = await getFinancialTransactions({
      page,
      pageSize,
      type,
      startDate,
      endDate,
    });

    return jsonOk(result);
  } catch (err: unknown) {
    const httpError = toHttpError(err);
    return jsonError(httpError.message ?? "Internal Server Error", httpError.status ?? 500);
  }
}
