// app/api/orders/[id]/request-cancel/route.ts
import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyBearerAuth } from "@/lib/auth";
import { jsonError, jsonOk, toHttpError } from "@/lib/http";
import { sendMail } from "@/lib/mailer";
import {
  generateOrderCancelRequestedEmail,
  generateOrderCancelAdminNotifyEmail,
} from "@/lib/email-templates";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const me = await verifyBearerAuth(req);
    const { id } = await ctx.params;

    const body = await req.json().catch(() => null);

    const Schema = z.object({
      reason: z
        .string()
        .min(5, "Lý do hủy tối thiểu 5 ký tự")
        .max(1000, "Lý do tối đa 1000 ký tự"),
    });

    const parsed = Schema.safeParse(body);
    if (!parsed.success) {
      return jsonError("Lý do hủy không hợp lệ", 400, { issues: parsed.error.issues });
    }

    const reason = parsed.data.reason.trim();

    const order = await prisma.order.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        prevStatusBeforeCancel: true,
        cancelRejectAt: true,
        userId: true,
        code: true,
        customerFullName: true,
        customerEmail: true,
      },
    });

    if (!order) return jsonError("Không tìm thấy đơn hàng", 404);

    // ✅ dùng me.sub (kiểu token của bạn)
    if (order.userId !== me.sub) {
      return jsonError("Bạn không có quyền hủy đơn này", 403);
    }

    const allowed = ["pending", "paid", "processing"];
    if (!allowed.includes(order.status)) {
      return jsonError("Không thể yêu cầu hủy đơn ở trạng thái hiện tại", 400);
    }

    if (order.cancelRejectAt) {
      return jsonError("Yêu cầu hủy đơn trước đó đã bị từ chối, không thể gửi lại", 400);
    }

    const prevStatus = order.status;

    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id },
        data: {
          status: "cancel_requested",
          cancelRequestReason: reason,
          prevStatusBeforeCancel: prevStatus,
          cancelRejectAt: null,
          cancelRejectReason: null,
        },
      });

      await tx.orderstatushistory.create({
        data: {
          orderId: id,
          fromStatus: prevStatus,
          toStatus: "cancel_requested",
          reason,
          createdBy: me.sub,
        },
      });
    });

    try {
      // gửi customer
      if (order.customerEmail) {
        const email = generateOrderCancelRequestedEmail(
          order.code,
          order.customerFullName ?? "Quý khách",
          reason,
        );
        await sendMail({
          to: order.customerEmail,
          subject: email.subject,
          text: email.text,
          html: email.html,
        });
      }

      // gửi admin
      const adminEmail = process.env.ADMIN_EMAIL || "admin@ahso.vn";
      const adminEmailData = generateOrderCancelAdminNotifyEmail(
        order.code,
        order.customerFullName ?? "Khách hàng",
        reason,
      );

      await sendMail({
        to: adminEmail,
        subject: adminEmailData.subject,
        text: adminEmailData.text,
        html: adminEmailData.html,
      });
    } catch (err) {
      console.error("Email send failed:", err);
    }

    return jsonOk({ success: true });
  } catch (err) {
    const httpError = toHttpError(err);
    return jsonError(httpError.message ?? "Internal Server Error", httpError.status ?? 500);
  }
}
