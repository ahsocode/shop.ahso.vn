// app/api/staff/orders/[id]/route.ts (UPDATED)
import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyBearerAuth, requireRole } from "@/lib/auth";
import { jsonError, jsonOk, toHttpError } from "@/lib/http";
import type { orderUpdateInput } from "@/lib/prisma-types";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { sendMail } from "@/lib/mailer";
import {
  generateOrderPaidEmail,
  generateOrderShippedEmail,
  generateOrderCancelledEmail,
  generateOrderCancelApprovedEmail,
} from "@/lib/email-templates";
import type { order_status } from "@/generated/enums";
import {
  decreaseStockOnShipped,
  restoreStockOnCancelled,
  increasePurchaseCountOnDelivered,
} from "@/lib/stock-finance-service";

export const dynamic = "force-dynamic";

type OrderStatus = order_status;

const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ["paid", "processing", "shipped", "delivered", "cancelled"],
  paid: ["processing", "shipped", "delivered", "cancelled"],
  processing: ["shipped", "delivered", "cancelled"],
  shipped: ["delivered", "cancelled"],
  delivered: [],
  cancel_requested: ["cancelled"],
  cancelled: [],
};

const UpdateOrderSchema = z
  .object({
    status: z
      .enum(["pending", "paid", "processing", "shipped", "delivered", "cancel_requested", "cancelled"])
      .optional(),
    note: z.string().trim().max(1000).optional(),
    shippingMethod: z.string().trim().max(120).optional(),
    cancelReason: z.string().trim().max(1000).optional(),
  })
  .refine(
    (val) =>
      val.status !== undefined ||
      val.note !== undefined ||
      val.shippingMethod !== undefined ||
      val.cancelReason !== undefined,
    { message: "Không có thay đổi nào được gửi lên", path: ["status"] }
  );

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
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

    const existing = await prisma.order.findUnique({
      where: { id },
      select: {
        status: true,
        cancelRequestReason: true,
        customerFullName: true,
        customerEmail: true,
      },
    });

    if (!existing) {
      return jsonError("Không tìm thấy đơn hàng", 404);
    }

    const updates: orderUpdateInput = {};
    const { status, note, shippingMethod, cancelReason } = parsed.data;
    const prevStatus = existing.status as OrderStatus;

    // Validate transition
    if (status && status !== prevStatus) {
      const allowedNext = ALLOWED_TRANSITIONS[prevStatus] ?? [];
      if (!allowedNext.includes(status as OrderStatus)) {
        return jsonError("Không thể chuyển trạng thái đơn hàng theo cách này", 400);
      }
    }

    // Validate cancelReason
    if (status === "cancelled" && prevStatus !== "cancel_requested") {
      if (!cancelReason || !cancelReason.trim()) {
        return jsonError("Vui lòng nhập lý do hủy đơn", 400);
      }
    }

    if (status) updates.status = status;
    if (note !== undefined) updates.note = note || null;
    if (shippingMethod !== undefined) updates.shippingMethod = shippingMethod || null;
    if (cancelReason !== undefined) updates.cancelReason = cancelReason || null;

    const updated = await prisma.order.update({
      where: { id },
      data: updates,
      select: {
        id: true,
        code: true,
        status: true,
        note: true,
        cancelReason: true,
        cancelRequestReason: true,
        shippingMethod: true,
        updatedAt: true,
        customerFullName: true,
        customerEmail: true,
      },
    });

    const prev = prevStatus;
    const next = updated.status as OrderStatus;

    // ⭐ XỬ LÝ TỒN KHO & TÀI CHÍNH
    try {
      // 1. Khi chuyển sang SHIPPED → Giảm tồn kho
      if (prev !== "shipped" && next === "shipped") {
        await decreaseStockOnShipped(id, me.sub);
        console.log(`✅ Stock decreased for order ${updated.code}`);
      }

      // 2. Khi chuyển sang DELIVERED → Tăng purchase count & ghi nhận doanh thu
      if (prev !== "delivered" && next === "delivered") {
        await increasePurchaseCountOnDelivered(id);
        console.log(`✅ Purchase count increased for order ${updated.code}`);
      }

      // 3. Khi HỦY đơn sau khi đã SHIPPED → Hoàn kho
      if (next === "cancelled" && (prev === "shipped" || prev === "processing")) {
        await restoreStockOnCancelled(id, me.sub);
        console.log(`✅ Stock restored for cancelled order ${updated.code}`);
      }
    } catch (stockError) {
      console.error("❌ Stock/Finance operation failed:", stockError);
      // Không throw để vẫn cập nhật status, nhưng log lỗi
    }

    // 📧 GỬI EMAIL
    try {
      if (prev !== next && updated.customerEmail) {
        const customerName = updated.customerFullName ?? "Quý khách";

        if (next === "paid") {
          const email = generateOrderPaidEmail(updated.code, customerName);
          await sendMail({
            to: updated.customerEmail,
            subject: email.subject,
            text: email.text,
            html: email.html,
          });
        } else if (next === "shipped") {
          const email = generateOrderShippedEmail(
            updated.code,
            customerName,
            updated.shippingMethod || undefined
          );
          await sendMail({
            to: updated.customerEmail,
            subject: email.subject,
            text: email.text,
            html: email.html,
          });
        } else if (next === "cancelled") {
          if (prev === "cancel_requested") {
            const email = generateOrderCancelApprovedEmail(updated.code, customerName);
            await sendMail({
              to: updated.customerEmail,
              subject: email.subject,
              text: email.text,
              html: email.html,
            });
          } else {
            const email = generateOrderCancelledEmail(
              updated.code,
              customerName,
              updated.cancelReason || undefined
            );
            await sendMail({
              to: updated.customerEmail,
              subject: email.subject,
              text: email.text,
              html: email.html,
            });
          }
        }
      }
    } catch (emailErr) {
      console.error("Failed to send status change email:", emailErr);
    }

    return jsonOk({ data: updated });
  } catch (err: unknown) {
    if (err instanceof PrismaClientKnownRequestError && err.code === "P2025") {
      return jsonError("Không tìm thấy đơn hàng", 404);
    }
    const httpError = toHttpError(err);
    return jsonError(httpError.message ?? "Internal Server Error", httpError.status ?? 500);
  }
}