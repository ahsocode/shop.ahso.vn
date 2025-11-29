// app/api/admin/staff-list/route.ts
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyBearerAuth, requireRole } from "@/lib/auth";
import { jsonOk, jsonError, toHttpError } from "@/lib/http";

/**
 * GET /api/admin/staff-list
 * Danh sách staff để admin phân công
 */
export async function GET(req: NextRequest) {
  try {
    const me = await verifyBearerAuth(req);
    requireRole(me, ["ADMIN"]);

    const staff = await prisma.user.findMany({
      where: {
        role: { in: ["STAFF", "ADMIN"] },
        isBlocked: false,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
      },
      orderBy: { fullName: "asc" },
    });

    return jsonOk({ data: staff });
  } catch (error) {
    const err = toHttpError(error);
    return jsonError(err.message || "Internal Error", err.status || 500);
  }
}