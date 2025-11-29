// app/api/staff/quote-requests/route.ts
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyBearerAuth, requireRole } from "@/lib/auth";
import { jsonOk, jsonError, toHttpError, parsePaging, getQueryParam } from "@/lib/http";
import { quote_status, contact_priority } from "@/generated/enums";
import type { quoterequestWhereInput } from "@/generated/models/quoterequest";

const statusValues = new Set(Object.values(quote_status));
const priorityValues = new Set(Object.values(contact_priority));

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

    const where: quoterequestWhereInput = {
      ...(q && {
        OR: [
          { code: { contains: q } },
          { fullName: { contains: q } },
          { phone: { contains: q } },
          { email: { contains: q } },
          { productName: { contains: q } },
        ],
      }),
      ...(statusValues.has(statusParam as quote_status)
        ? { status: statusParam as quote_status }
        : {}),
      ...(priorityValues.has(priorityParam as contact_priority)
        ? { priority: priorityParam as contact_priority }
        : {}),
      ...(assignedToMe ? { assignedTo: me.sub } : {}),
    };

    const [total, rows] = await Promise.all([
      prisma.quoterequest.count({ where }),
      prisma.quoterequest.findMany({
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
          productName: true,
          quantity: true,
          status: true,
          priority: true,
          assignedTo: true,
          createdAt: true,
          message: true,
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
