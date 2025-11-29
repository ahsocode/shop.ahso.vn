// app/api/admin/contacts/[id]/assign-staff/route.ts
import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyBearerAuth, requireRole } from "@/lib/auth";
import { jsonOk, jsonError, toHttpError } from "@/lib/http";

const AssignStaffSchema = z.object({
  staffId: z.string().min(1, "Staff ID là bắt buộc"),
});

/**
 * POST /api/admin/contacts/[id]/assign-staff
 * Admin phân công staff xử lý
 */
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const me = await verifyBearerAuth(req);
    requireRole(me, ["ADMIN"]);
    const { id } = await ctx.params;

    const body = await req.json();
    const parsed = AssignStaffSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError("Validation Error", 400, {
        issues: parsed.error.issues,
      });
    }

    const { staffId } = parsed.data;

    // Kiểm tra staff tồn tại & có role phù hợp
    const staff = await prisma.user.findUnique({
      where: { id: staffId },
      select: { id: true, role: true, fullName: true },
    });

    if (!staff) {
      return jsonError("Không tìm thấy staff", 404);
    }

    if (staff.role !== "STAFF" && staff.role !== "ADMIN") {
      return jsonError("User này không phải là staff", 400);
    }

    // Kiểm tra contact tồn tại
    const contact = await prisma.contact.findUnique({
      where: { id },
      select: { id: true, status: true },
    });

    if (!contact) {
      return jsonError("Không tìm thấy yêu cầu liên hệ", 404);
    }

    // Cập nhật assignment
    const updated = await prisma.contact.update({
      where: { id },
      data: {
        assignedTo: staffId,
        status: contact.status === "new" ? "in_progress" : contact.status,
        updatedAt: new Date(),
      },
      select: {
        id: true,
        code: true,
        fullName: true,
        phone: true,
        status: true,
        assignedTo: true,
      },
    });

    return jsonOk({
      data: updated,
      message: `Đã phân công cho ${staff.fullName}`,
    });
  } catch (error) {
    const err = toHttpError(error);
    return jsonError(err.message || "Internal Error", err.status || 500);
  }
}