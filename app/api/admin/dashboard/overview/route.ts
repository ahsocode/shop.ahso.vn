import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyBearerAuth, requireRole } from "@/lib/auth";
import { jsonOk, jsonError, toHttpError } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const me = await verifyBearerAuth(req);
    requireRole(me, ["ADMIN"]);

    const [
      contacts,
      quoteRequests,
      softwares,
      solutions,
      heroBanners,
      announcements,
      users,
      recentContacts,
      recentQuotes,
    ] = await Promise.all([
      prisma.contact.count(),
      prisma.quoterequest.count(),
      prisma.software.count(),
      prisma.solution.count(),
      prisma.herobanner.count(),
      prisma.siteannouncement.count(),
      prisma.user.count(),
      prisma.contact.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, code: true, fullName: true, phone: true, subject: true, status: true, createdAt: true },
      }),
      prisma.quoterequest.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, code: true, fullName: true, phone: true, productName: true, status: true, createdAt: true },
      }),
    ]);

    return jsonOk({
      stats: {
        contacts,
        quoteRequests,
        softwares,
        solutions,
        heroBanners,
        announcements,
        users,
      },
      recentContacts: recentContacts.map((item) => ({
        ...item,
        createdAt: item.createdAt.toISOString(),
      })),
      recentQuotes: recentQuotes.map((item) => ({
        ...item,
        createdAt: item.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    const httpError = toHttpError(err);
    return jsonError(httpError.message ?? "Internal Server Error", httpError.status ?? 500);
  }
}
