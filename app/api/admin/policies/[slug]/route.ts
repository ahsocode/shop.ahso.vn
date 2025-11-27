"use server";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyBearerAuth, requireRole } from "@/lib/auth";
import { POLICY_SECTIONS, updatePolicySection } from "@/lib/policy-defs";

const UpdateSchema = z.object({
  description: z.string().max(2000).optional().nullable(),
  allowedText: z.string().max(4000).optional().nullable(),
  deniedText: z.string().max(4000).optional().nullable(),
  content: z.string().max(4000).optional().nullable(),
});

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ slug: string }> },
) {
  const me = await verifyBearerAuth(req);
  requireRole(me, ["ADMIN"]);
  const { slug } = await context.params;
  const validSlug = POLICY_SECTIONS.find((s) => s.slug === slug);
  if (!validSlug) {
    return NextResponse.json({ error: "UNKNOWN_POLICY" }, { status: 404 });
  }
  const body = await req.json().catch(() => null);
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "INVALID_INPUT", issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const updated = await updatePolicySection(slug as typeof validSlug.slug, parsed.data);
  return NextResponse.json({ data: updated });
}
