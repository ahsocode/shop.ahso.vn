"use server";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyBearerAuth, requireRole } from "@/lib/auth";

const CreateBannerSchema = z.object({
  imageUrl: z.string().url(),
  title: z.string().max(200).optional().nullable(),
  content: z.string().max(500).optional().nullable(),
  ctaLabel: z.string().max(80).optional().nullable(),
  ctaHref: z.string().url().optional().nullable(),
  sortOrder: z.number().int().min(0).max(999).optional(),
  isActive: z.boolean().optional(),
  overlayOn: z.boolean().optional(),
  overlayColor: z.string().max(50).optional().nullable(),
  textColor: z.string().max(50).optional().nullable(),
  textPosition: z
    .enum(["TOP_LEFT", "TOP_RIGHT", "MIDDLE_LEFT", "MIDDLE_RIGHT", "BOTTOM_LEFT", "BOTTOM_RIGHT"])
    .optional(),
});

export async function GET(req: NextRequest) {
  const me = await verifyBearerAuth(req);
  requireRole(me, ["ADMIN", "STAFF"]);

  const banners = await prisma.herobanner.findMany({
    orderBy: { sortOrder: "asc" },
  });
  return NextResponse.json({ data: banners });
}

export async function POST(req: NextRequest) {
  const me = await verifyBearerAuth(req);
  requireRole(me, ["ADMIN"]);
  const body = await req.json().catch(() => null);
  const parsed = CreateBannerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "INVALID_INPUT", issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const created = await prisma.herobanner.create({
    data: {
      imageUrl: parsed.data.imageUrl,
      title: parsed.data.title || null,
      content: parsed.data.content || null,
      ctaLabel: parsed.data.ctaLabel || null,
      ctaHref: parsed.data.ctaHref || null,
      sortOrder: parsed.data.sortOrder ?? 0,
      isActive: parsed.data.isActive ?? true,
      overlayOn: parsed.data.overlayOn ?? false,
      overlayColor: parsed.data.overlayColor || null,
      textColor: parsed.data.textColor || null,
      textPosition: parsed.data.textPosition ?? "MIDDLE_LEFT",
    },
  });
  return NextResponse.json({ data: created });
}
