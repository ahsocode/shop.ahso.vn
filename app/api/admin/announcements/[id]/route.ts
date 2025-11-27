"use server";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyBearerAuth, requireRole } from "@/lib/auth";

const UpdateSchema = z.object({
  title: z.string().max(200).optional().nullable(),
  content: z.string().max(600).optional().nullable(),
  imageUrl: z.string().url().optional().nullable(),
  ctaLabel: z.string().max(80).optional().nullable(),
  ctaHref: z.string().url().optional().nullable(),
  isActive: z.boolean().optional(),
  showOnLogin: z.boolean().optional(),
  showOnVisit: z.boolean().optional(),
});

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const me = await verifyBearerAuth(req);
  requireRole(me, ["ADMIN"]);
  const { id } = await context.params;
  const body = await req.json().catch(() => null);
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "INVALID_INPUT", issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const updated = await prisma.siteannouncement.update({
    where: { id },
    data: parsed.data,
  });
  return NextResponse.json({ data: updated });
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const me = await verifyBearerAuth(req);
  requireRole(me, ["ADMIN"]);
  const { id } = await context.params;
  await prisma.siteannouncement.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
