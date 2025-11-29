// app/api/staff/quote-requests/[id]/assign/route.ts
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyBearerAuth, requireRole } from "@/lib/auth";
import { jsonOk, jsonError, toHttpError } from "@/lib/http";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const me = await verifyBearerAuth(req);
    requireRole(me, ["STAFF", "ADMIN"]);
    const { id } = await ctx.params;

    const existing = await prisma.quoterequest.findUnique({
      where: { id },
      select: { id: true, assignedTo: true, status: true },
    });
    if (!existing) return jsonError("Không tìm thấy yêu cầu", 404);

    if (existing.assignedTo && existing.assignedTo !== me.sub) {
      return jsonError("Yêu cầu này đã được nhận bởi người khác", 409);
    }

    const updated = await prisma.quoterequest.update({
      where: { id },
      data: {
        assignedTo: me.sub,
      },
      select: { id: true, assignedTo: true, status: true },
    });

    return jsonOk({ data: updated, message: "Đã nhận xử lý yêu cầu báo giá" });
  } catch (error) {
    const err = toHttpError(error);
    return jsonError(err.message || "Internal Error", err.status || 500);
  }
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const me = await verifyBearerAuth(req);
    requireRole(me, ["STAFF", "ADMIN"]);
    const { id } = await ctx.params;

    const existing = await prisma.quoterequest.findUnique({
      where: { id },
      select: { assignedTo: true },
    });
    if (!existing) return jsonError("Không tìm thấy yêu cầu", 404);
    if (existing.assignedTo !== me.sub) {
      return jsonError("Bạn không được phân công yêu cầu này", 403);
    }

    const updated = await prisma.quoterequest.update({
      where: { id },
      data: { assignedTo: null },
      select: { id: true, assignedTo: true, status: true },
    });

    return jsonOk({ data: updated, message: "Đã trả lại yêu cầu" });
  } catch (error) {
    const err = toHttpError(error);
    return jsonError(err.message || "Internal Error", err.status || 500);
  }
}
