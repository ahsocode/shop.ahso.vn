// app/api/staff/contacts/[id]/assign/route.ts
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyBearerAuth, requireRole } from "@/lib/auth";
import { jsonOk, jsonError, toHttpError } from "@/lib/http";

/**
 * POST /api/staff/contacts/[id]/assign
 * Staff tự nhận việc xử lý liên hệ
 */
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const me = await verifyBearerAuth(req);
    requireRole(me, ["STAFF", "ADMIN"]);
    const { id } = await ctx.params;

    // Kiểm tra contact tồn tại
    const contact = await prisma.contact.findUnique({
      where: { id },
      select: { id: true, assignedTo: true, status: true },
    });

    if (!contact) {
      return jsonError("Không tìm thấy yêu cầu liên hệ", 404);
    }

    // Nếu đã có người nhận
    if (contact.assignedTo && contact.assignedTo !== me.sub) {
      return jsonError("Yêu cầu này đã được nhận bởi staff khác", 409);
    }

    // Cập nhật assignedTo
    const updated = await prisma.contact.update({
      where: { id },
      data: {
        assignedTo: me.sub,
        status: contact.status === "new" ? "in_progress" : contact.status,
        updatedAt: new Date(),
      },
    });

    return jsonOk({
      data: updated,
      message: "Đã nhận việc xử lý yêu cầu này",
    });
  } catch (error) {
    const err = toHttpError(error);
    return jsonError(err.message || "Internal Error", err.status || 500);
  }
}

/**
 * DELETE /api/staff/contacts/[id]/assign
 * Staff từ chối/trả lại việc
 */
export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const me = await verifyBearerAuth(req);
    requireRole(me, ["STAFF", "ADMIN"]);
    const { id } = await ctx.params;

    const contact = await prisma.contact.findUnique({
      where: { id },
      select: { assignedTo: true },
    });

    if (!contact) {
      return jsonError("Không tìm thấy yêu cầu", 404);
    }

    if (contact.assignedTo !== me.sub) {
      return jsonError("Bạn không được phân công xử lý yêu cầu này", 403);
    }

    const updated = await prisma.contact.update({
      where: { id },
      data: {
        assignedTo: null,
        updatedAt: new Date(),
      },
    });

    return jsonOk({
      data: updated,
      message: "Đã trả lại yêu cầu",
    });
  } catch (error) {
    const err = toHttpError(error);
    return jsonError(err.message || "Internal Error", err.status || 500);
  }
}