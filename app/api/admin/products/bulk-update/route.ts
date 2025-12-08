import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyBearerAuth, requireRole } from "@/lib/auth";
import { jsonOk, jsonError, toHttpError } from "@/lib/http";
import { z } from "zod";

const hasOwn = <Obj extends Record<PropertyKey, unknown>>(
  obj: Obj,
  key: PropertyKey,
): key is keyof Obj => Object.prototype.hasOwnProperty.call(obj, key);

const BulkUpdateSchema = z.object({
  productIds: z.array(z.string().uuid()).min(1, "Chưa chọn sản phẩm"),
  supplierId: z.string().uuid().nullable().optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
  requiresQuote: z.boolean().optional(),
  typeId: z.string().uuid().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const me = await verifyBearerAuth(req);
    requireRole(me, ["ADMIN"]);

    const body = await req.json();
    const parsed = BulkUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError("Validation Error", 400, { issues: parsed.error.issues });
    }

    const { productIds, supplierId, status, requiresQuote, typeId } = parsed.data;
    const hasSupplier = hasOwn(parsed.data, "supplierId");
    const hasStatus = typeof status !== "undefined";
    const hasQuote = typeof requiresQuote !== "undefined";
    const hasType = typeof typeId !== "undefined";

    if (!hasSupplier && !hasStatus && !hasQuote && !hasType) {
      return jsonError("Không có dữ liệu cần cập nhật", 400);
    }

    if (hasSupplier && supplierId) {
      const supplier = await prisma.supplier.findUnique({
        where: { id: supplierId },
        select: { id: true },
      });
      if (!supplier) return jsonError("Không tìm thấy nguồn hàng", 400);
    }

    if (hasType && typeId) {
      const type = await prisma.producttype.findUnique({
        where: { id: typeId },
        select: { id: true },
      });
      if (!type) return jsonError("Không tìm thấy loại sản phẩm", 400);
    }

    const data: Record<string, unknown> = { updatedAt: new Date() };
    if (hasSupplier) data.supplierId = supplierId ?? null;
    if (hasStatus) data.status = status;
    if (hasQuote) data.requiresQuote = requiresQuote;
    if (hasType && typeId) data.typeId = typeId;

    const result = await prisma.product.updateMany({
      where: { id: { in: productIds } },
      data,
    });

    return jsonOk({ updated: result.count });
  } catch (error) {
    const err = toHttpError(error);
    return jsonError(err.message || "Internal Error", err.status || 500);
  }
}
