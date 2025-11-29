// app/api/staff/contacts/route.ts
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyBearerAuth, requireRole } from "@/lib/auth";
import { jsonOk, jsonError, toHttpError, parsePaging, getQueryParam } from "@/lib/http";
import { contact_status, contact_priority } from "@/generated/enums";

const statusValues = new Set(Object.values(contact_status));
const priorityValues = new Set(Object.values(contact_priority));

/**
 * GET /api/staff/contacts
 * Danh sách yêu cầu liên hệ cho staff
 */
export async function GET(req: NextRequest) {
  try {
    const me = await verifyBearerAuth(req);
    requireRole(me, ["STAFF", "ADMIN"]);

    const { page, pageSize, skip, take } = parsePaging(req, {
      defaultPageSize: 20,
      maxPageSize: 100,
    });

    const q = getQueryParam(req, "q");
    const statusParam = getQueryParam(req, "status").toLowerCase();
    const priorityParam = getQueryParam(req, "priority").toLowerCase();
    const assignedToMe = getQueryParam(req, "assignedToMe") === "true";

    const where: Record<string, unknown> = {
      ...(q && {
        OR: [
          { code: { contains: q } },
          { fullName: { contains: q } },
          { phone: { contains: q } },
          { email: { contains: q } },
          { company: { contains: q } },
        ],
      }),
      ...(statusValues.has(statusParam as contact_status)
        ? { status: statusParam }
        : {}),
      ...(priorityValues.has(priorityParam as contact_priority)
        ? { priority: priorityParam }
        : {}),
      ...(assignedToMe ? { assignedTo: me.sub } : {}),
    };

    const [total, rows] = await Promise.all([
      prisma.contact.count({ where }),
      prisma.contact.findMany({
        where,
        orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
        skip,
        take,
        select: {
          id: true,
          code: true,
          fullName: true,
          phone: true,
          email: true,
          company: true,
          subject: true,
          status: true,
          priority: true,
          assignedTo: true,
          createdAt: true,
          respondedAt: true,
        },
      }),
    ]);

    return jsonOk({
      data: rows,
      meta: { total, page, pageSize },
    });
  } catch (error) {
    const err = toHttpError(error);
    return jsonError(err.message || "Internal Error", err.status || 500);
  }
}
