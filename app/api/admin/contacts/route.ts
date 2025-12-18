import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyBearerAuth, requireRole } from "@/lib/auth";
import { jsonOk, jsonError, toHttpError, parsePaging, getQueryParam } from "@/lib/http";
import type { Prisma } from "@prisma/client";
import { contact_status, contact_priority } from "@prisma/client";
import { ContactUpdateSchema, contactSelect, mapContactRow } from "./utils";

const statusSet = new Set(Object.values(contact_status));
const prioritySet = new Set(Object.values(contact_priority));

const parseDate = (value: string | null) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export async function GET(req: NextRequest) {
  try {
    const me = await verifyBearerAuth(req);
    requireRole(me, ["ADMIN", "STAFF"]);

    const { page, pageSize, skip, take } = parsePaging(req, { defaultPageSize: 20, maxPageSize: 100 });
    const url = new URL(req.url);
    const q = getQueryParam(req, "q");
    const statusParam = getQueryParam(req, "status").toLowerCase();
    const priorityParam = getQueryParam(req, "priority").toLowerCase();
    const source = getQueryParam(req, "source");
    const typeId = getQueryParam(req, "typeId");
    const assignedTo = getQueryParam(req, "assignedTo");
    const dateFrom = parseDate(url.searchParams.get("dateFrom"));
    const dateTo = parseDate(url.searchParams.get("dateTo"));

    const where: Prisma.contactWhereInput = {
      ...(q && {
        OR: [
          { code: { contains: q } },
          { fullName: { contains: q } },
          { phone: { contains: q } },
          { email: { contains: q } },
          { company: { contains: q } },
          { subject: { contains: q } },
          { message: { contains: q } },
        ],
      }),
      ...(statusSet.has(statusParam as contact_status) ? { status: statusParam as contact_status } : {}),
      ...(prioritySet.has(priorityParam as contact_priority)
        ? { priority: priorityParam as contact_priority }
        : {}),
      ...(source && { source }),
      ...(typeId && { typeId }),
      ...(assignedTo && { assignedTo }),
      ...((dateFrom || dateTo) && {
        createdAt: {
          ...(dateFrom ? { gte: dateFrom } : {}),
          ...(dateTo ? { lte: dateTo } : {}),
        },
      }),
    };

    const [total, rows] = await Promise.all([
      prisma.contact.count({ where }),
      prisma.contact.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take,
        select: contactSelect,
      }),
    ]);

    return jsonOk({
      data: rows.map(mapContactRow),
      meta: { total, page, pageSize },
    });
  } catch (error) {
    const err = toHttpError(error);
    return jsonError(err.message || "Internal Error", err.status || 500);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const me = await verifyBearerAuth(req);
    requireRole(me, ["ADMIN", "STAFF"]);

    const body = await req.json();
    const parsed = ContactUpdateSchema.safeParse(body);
    if (!parsed.success) return jsonError("Validation Error", 400, { issues: parsed.error.issues });

    const ids = (body.ids as string[] | undefined)?.filter(Boolean);
    if (!ids || !ids.length) return jsonError("Thiếu danh sách contactId", 400);

    const updates = buildUpdateData(parsed.data);
    if (!Object.keys(updates).length) return jsonError("Không có dữ liệu cần cập nhật", 400);

    await prisma.contact.updateMany({
      where: { id: { in: ids } },
      data: updates,
    });

    return jsonOk({ ok: true });
  } catch (error) {
    const err = toHttpError(error);
    return jsonError(err.message || "Internal Error", err.status || 500);
  }
}

const buildUpdateData = (
  payload: z.infer<typeof ContactUpdateSchema>
): Prisma.contactUpdateManyMutationInput => {
  const data: Prisma.contactUpdateManyMutationInput = {};
  if (payload.status) data.status = payload.status;
  if (payload.priority) data.priority = payload.priority;
  if ("assignedTo" in payload) data.assignedTo = payload.assignedTo?.trim() || null;
  if ("response" in payload) data.response = payload.response?.trim() || null;
  if ("respondedAt" in payload) data.respondedAt = payload.respondedAt ?? null;
  if ("respondedBy" in payload) data.respondedBy = payload.respondedBy?.trim() || null;
  if ("internalNotes" in payload) data.internalNotes = payload.internalNotes?.trim() || null;
  return data;
};
