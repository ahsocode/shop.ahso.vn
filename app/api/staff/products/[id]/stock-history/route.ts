import type { NextRequest } from "next/server";
import { verifyBearerAuth, requireRole } from "@/lib/auth";
import { jsonError, jsonOk, toHttpError } from "@/lib/http";
import { getProductStockHistory } from "@/lib/stock-finance-service";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const me = await verifyBearerAuth(req);
    requireRole(me, ["STAFF", "ADMIN"]);

    const { id } = await context.params;
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    const history = await getProductStockHistory(id, limit);

    return jsonOk({ data: history });
  } catch (err: unknown) {
    const httpError = toHttpError(err);
    return jsonError(httpError.message ?? "Internal Server Error", httpError.status ?? 500);
  }
}
