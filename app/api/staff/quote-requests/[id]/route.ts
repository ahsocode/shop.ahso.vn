import { z } from "zod";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyBearerAuth, requireRole } from "@/lib/auth";
import { jsonOk, jsonError, toHttpError } from "@/lib/http";
import { quote_status, contact_priority } from "@/generated/enums";

//
// ====== SCHEMA ======
//  
const UpdateSchema = z.object({
  status: z.nativeEnum(quote_status).optional(),
  response: z.string().trim().max(10000).optional(),
  internalNotes: z.string().trim().max(10000).optional(),
});

//
// ====== SELECT ======
//
const quoteSelect = {
  id: true,
  code: true,
  fullName: true,
  phone: true,
  email: true,
  productName: true,
  quantity: true,
  message: true,
  status: true,
  priority: true,
  assignedTo: true,

  response: true,
  respondedAt: true,
  respondedBy: true,

  internalNotes: true,
  createdAt: true,
  updatedAt: true,
} as const;

//
// ====== GET DETAIL ======
//
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const me = await verifyBearerAuth(req);
    requireRole(me, ["STAFF", "ADMIN"]);
    const { id } = await ctx.params;

    const quote = await prisma.quoterequest.findUnique({
      where: { id },
      select: quoteSelect,
    });

    if (!quote) {
      return jsonError("Không tìm thấy yêu cầu báo giá", 404);
    }

    return jsonOk({ data: quote });
  } catch (error) {
    const err = toHttpError(error);
    return jsonError(err.message || "Internal Error", err.status || 500);
  }
}

//
// ====== PATCH UPDATE ======
//
export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const me = await verifyBearerAuth(req);
    requireRole(me, ["STAFF", "ADMIN"]);
    const { id } = await ctx.params;

    const raw = await req.json();
    const parsed = UpdateSchema.safeParse(raw);

    if (!parsed.success) {
      return jsonError("Validation Error", 400, {
        issues: parsed.error.issues,
      });
    }

    const updates = parsed.data;
    if (!Object.keys(updates).length) {
      return jsonError("Không có dữ liệu cần cập nhật", 400);
    }

    const data: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    // status
    if (updates.status) data.status = updates.status;

    // response (kèm respondedAt/by)
    if (updates.response !== undefined) {
      const trimmed = updates.response.trim();
      data.response = trimmed || null;
      data.respondedAt = trimmed ? new Date() : null;
      data.respondedBy = trimmed ? me.sub : null;
    }

    // internalNotes
    if (updates.internalNotes !== undefined) {
      data.internalNotes = updates.internalNotes.trim() || null;
    }

    const updated = await prisma.quoterequest.update({
      where: { id },
      data,
      select: quoteSelect,
    });

    return jsonOk({ data: updated });
  } catch (error) {
    const err = toHttpError(error);
    return jsonError(err.message || "Internal Error", err.status || 500);
  }
}
