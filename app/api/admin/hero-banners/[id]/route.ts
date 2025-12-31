"use server";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyBearerAuth, requireRole } from "@/lib/auth";

const UpdateSchema = z.object({
  imageUrl: z.string().url().optional(),
  title: z.string().max(200).optional().nullable(),
  content: z.string().max(500).optional().nullable(),
  ctaLabel: z.string().max(80).optional().nullable(),
  ctaHref: z.string().url().optional().nullable(),
  sortOrder: z.number().int().min(0).max(999).optional(),
  isActive: z.boolean().optional(),
  overlayOn: z.boolean().optional(),
  overlayColor: z.string().max(50).optional().nullable(),
  textPosition: z
    .enum(["TOP_LEFT", "TOP_RIGHT", "MIDDLE_LEFT", "MIDDLE_RIGHT", "BOTTOM_LEFT", "BOTTOM_RIGHT"])
    .optional(),
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
  const updated = await prisma.herobanner.update({
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
  await prisma.herobanner.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
