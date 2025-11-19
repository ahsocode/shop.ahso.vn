import type { NextRequest } from "next/server";
import type { Prisma } from "@/generated/client";
import { prisma } from "@/lib/prisma";
import { verifyBearerAuth, requireRole } from "@/lib/auth";
import { jsonOk, jsonError, toHttpError } from "@/lib/http";
import { ContactUpdateSchema, contactSelect, mapContactRow } from "../utils";

const hasOwn = <T extends object, K extends keyof T>(obj: T, key: K): obj is T & Required<Pick<T, K>> =>
  Object.prototype.hasOwnProperty.call(obj, key);

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const me = await verifyBearerAuth(req);
    requireRole(me, ["ADMIN", "STAFF"]);
    const { id } = await ctx.params;

    const row = await prisma.contact.findUnique({
      where: { id },
      select: contactSelect,
    });
    if (!row) return jsonError("Not Found", 404);
    return jsonOk({ data: mapContactRow(row) });
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
    const parsed = ContactUpdateSchema.safeParse(body);
    if (!parsed.success) return jsonError("Validation Error", 400, { issues: parsed.error.issues });

    const updates = parsed.data;
    if (!Object.keys(updates).length) return jsonError("Không có dữ liệu cần cập nhật", 400);

    const data: Prisma.contactUpdateInput = {};
    if (updates.status) data.status = updates.status;
    if (updates.priority) data.priority = updates.priority;
    if (hasOwn(updates, "assignedTo")) data.assignedTo = updates.assignedTo?.trim() || null;
    if (hasOwn(updates, "response")) data.response = updates.response?.trim() || null;
    if (hasOwn(updates, "respondedAt")) data.respondedAt = updates.respondedAt ?? null;
    if (hasOwn(updates, "respondedBy")) data.respondedBy = updates.respondedBy?.trim() || null;
    if (hasOwn(updates, "internalNotes")) data.internalNotes = updates.internalNotes?.trim() || null;

    const updated = await prisma.contact.update({
      where: { id },
      data,
      select: contactSelect,
    });

    return jsonOk({ data: mapContactRow(updated) });
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

    await prisma.contact.delete({ where: { id } });
    return jsonOk({ ok: true });
  } catch (error) {
    const err = toHttpError(error);
    return jsonError(err.message || "Internal Error", err.status || 500);
  }
}
