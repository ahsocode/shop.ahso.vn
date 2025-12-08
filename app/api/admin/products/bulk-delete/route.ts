import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyBearerAuth, requireRole } from "@/lib/auth";
import { jsonOk, jsonError, toHttpError } from "@/lib/http";
import { z } from "zod";

const BulkDeleteSchema = z.object({
  productIds: z.array(z.string().uuid()).min(1, "Chưa chọn sản phẩm"),
});

export async function POST(req: NextRequest) {
  try {
    const me = await verifyBearerAuth(req);
    requireRole(me, ["ADMIN"]);

    const body = await req.json();
    const parsed = BulkDeleteSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError("Validation Error", 400, { issues: parsed.error.issues });
    }

    const { productIds } = parsed.data;

    const deleted = await prisma.product.deleteMany({
      where: { id: { in: productIds } },
    });

    return jsonOk({ deleted: deleted.count });
  } catch (error) {
    const err = toHttpError(error);
    return jsonError(err.message || "Internal Error", err.status || 500);
  }
}
