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
} from "@/lib/email-templates";

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

    const existing = await prisma.order.findUnique({
      where: { id },
      select: { status: true },
    });
    if (!existing) {
      return jsonError("Không tìm thấy đơn hàng", 404);
    }

    const updates: orderUpdateInput = {};
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
        customerFullName: true,
        customerEmail: true,
      },
    });

    // 📧 GỬI EMAIL KHI THAY ĐỔI TRẠNG THÁI
    try {
      const prevStatus = existing.status;
      const newStatus = updated.status;

      if (prevStatus !== newStatus && updated.customerEmail) {
        if (newStatus === "paid") {
          const email = generateOrderPaidEmail(updated.code, updated.customerFullName ?? "Quý khách");
          await sendMail({
            to: updated.customerEmail,
            subject: email.subject,
            text: email.text,
            html: email.html,
          });
        } else if (newStatus === "shipped") {
          const email = generateOrderShippedEmail(
            updated.code,
            updated.customerFullName ?? "Quý khách",
            updated.shippingMethod || undefined,
          );
          await sendMail({
            to: updated.customerEmail,
            subject: email.subject,
            text: email.text,
            html: email.html,
          });
        } else if (newStatus === "cancelled") {
          const email = generateOrderCancelledEmail(
            updated.code,
            updated.customerFullName ?? "Quý khách",
            updated.note || undefined,
          );
          await sendMail({
            to: updated.customerEmail,
            subject: email.subject,
            text: email.text,
            html: email.html,
          });
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
