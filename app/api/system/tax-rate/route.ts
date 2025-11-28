import type { NextRequest } from "next/server";
import { jsonError, jsonOk, toHttpError } from "@/lib/http";
import { getDefaultTaxRate } from "@/lib/system-settings";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const taxRate = await getDefaultTaxRate();
    return jsonOk({ taxRate });
  } catch (err: unknown) {
    const httpError = toHttpError(err);
    return jsonError(httpError.message ?? "Internal Server Error", httpError.status ?? 500);
  }
}
