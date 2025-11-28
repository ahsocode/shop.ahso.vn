// app/api/staff/orders/[id]/route.ts
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
  generateOrderCancelApprovedEmail, // 🔹 sẽ thêm ở email-templates
} from "@/lib/email-templates";
import type { order_status } from "@/generated/enums";

export const dynamic = "force-dynamic";

type OrderStatus = order_status;

// 🔹 Bảng transition cho trạng thái
const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ["paid", "processing", "shipped", "delivered", "cancelled"],
  paid: ["processing", "shipped", "delivered", "cancelled"],
  processing: ["shipped", "delivered", "cancelled"],
  shipped: ["delivered", "cancelled"],
  delivered: [],
  cancel_requested: ["cancelled"], // chỉ được chuyển sang cancelled
  cancelled: [],
};

const UpdateOrderSchema = z
  .object({
    status: z
      .enum(["pending", "paid", "processing", "shipped", "delivered", "cancel_requested", "cancelled"])
      .optional(),
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
    // 🔹 lý do hủy do staff nhập
    cancelReason: z
      .string()
      .trim()
      .max(1000, "Lý do hủy tối đa 1000 ký tự")
      .optional(),
  })
  .refine(
    (val) =>
      val.status !== undefined ||
      val.note !== undefined ||
      val.shippingMethod !== undefined ||
      val.cancelReason !== undefined,
    {
      message: "Không có thay đổi nào được gửi lên",
      path: ["status"],
    },
  );

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

    // 🔹 validate chuyển trạng thái
    if (status && status !== prevStatus) {
      const allowedNext = ALLOWED_TRANSITIONS[prevStatus] ?? [];
      if (!allowedNext.includes(status as OrderStatus)) {
        return jsonError("Không thể chuyển trạng thái đơn hàng theo cách này", 400);
      }
    }

    // 🔹 nếu hủy trực tiếp (không qua cancel_requested) thì bắt buộc có cancelReason
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

    // 📧 GỬI EMAIL KHI THAY ĐỔI TRẠNG THÁI
    try {
      const prev = prevStatus;
      const next = updated.status as OrderStatus;

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
            updated.shippingMethod || undefined,
          );
          await sendMail({
            to: updated.customerEmail,
            subject: email.subject,
            text: email.text,
            html: email.html,
          });
        } else if (next === "cancelled") {
          // 🔹 nếu trước đó là cancel_requested → chấp nhận yêu cầu hủy
          if (prev === "cancel_requested") {
            const email = generateOrderCancelApprovedEmail(updated.code, customerName);
            await sendMail({
              to: updated.customerEmail,
              subject: email.subject,
              text: email.text,
              html: email.html,
            });
          } else {
            // 🔹 hủy trực tiếp bởi staff (không qua request)
            const email = generateOrderCancelledEmail(
              updated.code,
              customerName,
              updated.cancelReason || undefined,
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
