import type { NextRequest } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { verifyBearerAuth, requireRole } from "@/lib/auth";
import { jsonOk, jsonError, toHttpError } from "@/lib/http";
import {
  QuoteRequestUpdateSchema,
  quoteRequestSelect,
  mapQuoteRequestRow,
} from "../utils";

const hasOwn = <T extends object, K extends keyof T>(obj: T, key: K): obj is T & Required<Pick<T, K>> =>
  Object.prototype.hasOwnProperty.call(obj, key);

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const me = await verifyBearerAuth(req);
    requireRole(me, ["ADMIN", "STAFF"]);
    const { id } = await ctx.params;

    const row = await prisma.quoterequest.findUnique({ where: { id }, select: quoteRequestSelect });
    if (!row) return jsonError("Not Found", 404);
    return jsonOk({ data: mapQuoteRequestRow(row) });
  } catch (error) {
    const err = toHttpError(error);
    return jsonError(err.message || "Internal Error", err.status || 500);
  }
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const me = await verifyBearerAuth(req);
    requireRole(me, ["ADMIN", "STAFF"]);
    const { id } = await ctx.params;

    const body = await req.json();
    const parsed = QuoteRequestUpdateSchema.omit({ status: true }).safeParse(body);
    if (!parsed.success) return jsonError("Validation Error", 400, { issues: parsed.error.issues });

    const updates = parsed.data;
    if (Object.keys(updates).length === 0) return jsonError("Không có dữ liệu cần cập nhật", 400);

    const existing = await prisma.quoterequest.findUnique({ where: { id } });
    if (!existing) return jsonError("Not Found", 404);

    const data: Prisma.quoterequestUpdateInput = {};

    if (hasOwn(updates, "code") && updates.code) {
      if (updates.code !== existing.code) {
        const dup = await prisma.quoterequest.findFirst({ where: { code: updates.code, id: { not: id } }, select: { id: true } });
        if (dup) return jsonError("Mã yêu cầu đã tồn tại", 409);
      }
      data.code = updates.code;
    }

    if (hasOwn(updates, "fullName") && updates.fullName) data.fullName = updates.fullName;
    if (hasOwn(updates, "phone") && updates.phone) data.phone = updates.phone;
    if (hasOwn(updates, "email")) data.email = updates.email ?? null;
    if (hasOwn(updates, "company")) data.company = updates.company ?? null;
    if (hasOwn(updates, "taxCode")) data.taxCode = updates.taxCode ?? null;
    if (hasOwn(updates, "productName")) data.productName = updates.productName ?? null;
    if (hasOwn(updates, "quantity")) data.quantity = updates.quantity ?? existing.quantity;
    if (hasOwn(updates, "message")) data.message = updates.message ?? null;
    if (hasOwn(updates, "quotedPrice")) data.quotedPrice = updates.quotedPrice ?? null;
    if (hasOwn(updates, "quotedTotal")) data.quotedTotal = updates.quotedTotal ?? null;
    if (hasOwn(updates, "validUntil")) data.validUntil = updates.validUntil ?? null;
    if (hasOwn(updates, "paymentTerms")) data.paymentTerms = updates.paymentTerms ?? null;
    if (hasOwn(updates, "deliveryTerms")) data.deliveryTerms = updates.deliveryTerms ?? null;
    if (hasOwn(updates, "priority") && updates.priority) data.priority = updates.priority;
    if (hasOwn(updates, "assignedTo")) data.assignedTo = updates.assignedTo ?? null;
    if (hasOwn(updates, "respondedBy")) data.respondedBy = updates.respondedBy ?? null;
    if (hasOwn(updates, "respondedAt")) data.respondedAt = updates.respondedAt ?? null;
    if (hasOwn(updates, "customerNotes")) data.customerNotes = updates.customerNotes ?? null;
    if (hasOwn(updates, "internalNotes")) data.internalNotes = updates.internalNotes ?? null;
    if (hasOwn(updates, "expiresAt")) data.expiresAt = updates.expiresAt ?? null;

    const assigning =
      hasOwn(updates, "assignedTo") && Boolean(updates.assignedTo?.trim()) && !existing.assignedTo;
    const unassigning =
      hasOwn(updates, "assignedTo") && !Boolean(updates.assignedTo?.trim()) && Boolean(existing.assignedTo);

    if (assigning && existing.status === "pending") {
      data.status = "quoted";
    } else if (unassigning) {
      data.status = "pending";
    }

    const updated = await prisma.quoterequest.update({
      where: { id },
      data,
      select: quoteRequestSelect,
    });

    return jsonOk({ data: mapQuoteRequestRow(updated) });
  } catch (error) {
    const err = toHttpError(error);
    return jsonError(err.message || "Internal Error", err.status || 500);
  }
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const me = await verifyBearerAuth(req);
    requireRole(me, ["ADMIN", "STAFF"]);
    const { id } = await ctx.params;

    await prisma.quoterequest.delete({ where: { id } });
    return jsonOk({ ok: true });
  } catch (error) {
    const err = toHttpError(error);
    return jsonError(err.message || "Internal Error", err.status || 500);
  }
}
