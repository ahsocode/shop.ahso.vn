import { z } from "zod";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyBearerAuth, requireRole } from "@/lib/auth";
import { jsonOk, jsonError, toHttpError } from "@/lib/http";
import { quote_status } from "@prisma/client";

//
// ====== SCHEMA ======
//  
const UpdateSchema = z.object({
  status: z.nativeEnum(quote_status).optional(),
  customerNotes: z.string().trim().max(10000).optional(),
  internalNotes: z.string().trim().max(10000).optional(),
});

const isUUID = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

//
// ====== SELECT ======
//
const quoteSelect = {
  id: true,
  code: true,
  fullName: true,
  phone: true,
  email: true,
  company: true,
  taxCode: true,
  productName: true,
  quantity: true,
  message: true,
  quotedPrice: true,
  quotedTotal: true,
  validUntil: true,
  paymentTerms: true,
  deliveryTerms: true,
  status: true,
  priority: true,
  assignedTo: true,

  respondedAt: true,
  respondedBy: true,

  customerNotes: true,
  internalNotes: true,
  createdAt: true,
  updatedAt: true,
  expiresAt: true,
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
    const where = {
      OR: [
        ...(isUUID(id) ? [{ id }] : []),
        { code: id },
      ],
    };

    const quote = await prisma.quoterequest.findFirst({
      where,
      select: quoteSelect,
    });

    if (!quote) {
      return jsonError("Không tìm thấy yêu cầu báo giá", 404);
    }

    return jsonOk({ data: quote });
  } catch (error) {
    console.error("STAFF quote GET error:", error);
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

    const where = {
      OR: [
        ...(isUUID(id) ? [{ id }] : []),
        { code: id },
      ],
    };

    const existing = await prisma.quoterequest.findFirst({
      where,
      select: { id: true },
    });

    if (!existing) {
      return jsonError("Không tìm thấy yêu cầu báo giá", 404);
    }

    const data: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    // status
    if (updates.status) data.status = updates.status;

    // customerNotes (phản hồi cho khách)
    if (updates.customerNotes !== undefined) {
      const trimmed = updates.customerNotes.trim();
      data.customerNotes = trimmed || null;
      data.respondedAt = trimmed ? new Date() : null;
      data.respondedBy = trimmed ? me.sub : null;
    }

    // internalNotes
    if (updates.internalNotes !== undefined) {
      data.internalNotes = updates.internalNotes.trim() || null;
    }

    const updated = await prisma.quoterequest.update({
      where: { id: existing.id },
      data,
      select: quoteSelect,
    });

    return jsonOk({ data: updated });
  } catch (error) {
    console.error("STAFF quote PATCH error:", error);
    const err = toHttpError(error);
    return jsonError(err.message || "Internal Error", err.status || 500);
  }
}
