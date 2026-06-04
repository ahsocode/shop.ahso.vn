"use server";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyBearerAuth, requireRole } from "@/lib/auth";
import { createPolicySection, getPolicySections } from "@/lib/policy-defs";

const PolicySchema = z.object({
  name: z.string().trim().min(1, "Tên chính sách là bắt buộc.").max(255),
  content: z.string().max(50000).default(""),
});

export async function GET(req: NextRequest) {
  const me = await verifyBearerAuth(req);
  requireRole(me, ["ADMIN", "STAFF"]);
  const data = await getPolicySections();
  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
  const me = await verifyBearerAuth(req);
  requireRole(me, ["ADMIN"]);

  const body = await req.json().catch(() => null);
  const parsed = PolicySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "INVALID_INPUT", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const created = await createPolicySection(parsed.data);
  return NextResponse.json({ data: created }, { status: 201 });
}
