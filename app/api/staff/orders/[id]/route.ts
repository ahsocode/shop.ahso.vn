import { NextRequest } from "next/server";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyBearerAuth, requireRole } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/http";

export const dynamic = "force-dynamic";

const UpdateOrderSchema = z
  .object({
    status: z.enum(["pending", "paid", "processing", "shipped", "delivered", "cancelled"]).optional(),
    note: z
      .string()
      .trim()
      .max(1000, "Ghi chú tối đa 1000 ký tự")
      .optional(),
    shippingMethod: z
      .string()
      .trim()
      .max(120, "Phương thức giao hàng tối đa 120 ký tự")
      .optional(),
  })
  .refine((val) => val.status || val.note !== undefined || val.shippingMethod !== undefined, {
    message: "Không có thay đổi nào được gửi lên",
    path: ["status"],
  });

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const me = await verifyBearerAuth(req);
    requireRole(me, ["STAFF", "ADMIN"]);
    const { id } = await context.params;
    const payload = await req.json().catch(() => null);

    const parsed = UpdateOrderSchema.safeParse(payload);
    if (!parsed.success) {
      return jsonError("Dữ liệu không hợp lệ", 400, { issues: parsed.error.issues });
    }

    const updates: Prisma.OrderUpdateInput = {};
    const { status, note, shippingMethod } = parsed.data;

    if (status) updates.status = status;
    if (note !== undefined) updates.note = note || null;
    if (shippingMethod !== undefined) updates.shippingMethod = shippingMethod || null;

    const updated = await prisma.order.update({
      where: { id },
      data: updates,
      select: {
        id: true,
        code: true,
        status: true,
        note: true,
        shippingMethod: true,
        updatedAt: true,
      },
    });

    return jsonOk({ data: updated });
  } catch (err: any) {
    if (err.code === "P2025") {
      return jsonError("Không tìm thấy đơn hàng", 404);
    }
    return jsonError(err.message || "Internal Server Error", err.status || 500);
  }
}
