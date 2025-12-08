"use server";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyBearerAuth, requireRole } from "@/lib/auth";

const AnnouncementSchema = z.object({
  title: z.string().max(200).optional().nullable(),
  content: z.string().max(600).optional().nullable(),
  imageUrl: z.string().url().optional().nullable(),
  ctaLabel: z.string().max(80).optional().nullable(),
  ctaHref: z.string().url().optional().nullable(),
  isActive: z.boolean().optional(),
  showOnLogin: z.boolean().optional(),
  showOnVisit: z.boolean().optional(),
});

export async function GET(req: NextRequest) {
  const me = await verifyBearerAuth(req);
  requireRole(me, ["ADMIN", "STAFF"]);
  const items = await prisma.siteannouncement.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ data: items });
}

export async function POST(req: NextRequest) {
  const me = await verifyBearerAuth(req);
  requireRole(me, ["ADMIN"]);
  const body = await req.json().catch(() => null);
  const parsed = AnnouncementSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "INVALID_INPUT", issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const created = await prisma.siteannouncement.create({
    data: {
      title: parsed.data.title || null,
      content: parsed.data.content || null,
      imageUrl: parsed.data.imageUrl || null,
      ctaLabel: parsed.data.ctaLabel || null,
      ctaHref: parsed.data.ctaHref || null,
      isActive: parsed.data.isActive ?? true,
      showOnLogin: parsed.data.showOnLogin ?? true,
      showOnVisit: parsed.data.showOnVisit ?? true,
    },
  });
  return NextResponse.json({ data: created });
}
