"use server";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyBearerAuth, requireRole } from "@/lib/auth";
import { getDefaultTaxRate, updateDefaultTaxRate } from "@/lib/system-settings";

const UpdateSchema = z.object({
  rate: z.number().min(0).max(100),
});

export async function GET(req: NextRequest) {
  const me = await verifyBearerAuth(req);
  requireRole(me, ["ADMIN", "STAFF"]);
  const rate = await getDefaultTaxRate();
  return NextResponse.json({ data: { rate } });
}

export async function PUT(req: NextRequest) {
  const me = await verifyBearerAuth(req);
  requireRole(me, ["ADMIN"]);
  const body = await req.json().catch(() => null);
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "INVALID_INPUT", issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const normalizedRate = parsed.data.rate > 1 ? parsed.data.rate / 100 : parsed.data.rate;
  const updated = await updateDefaultTaxRate(normalizedRate);
  return NextResponse.json({ data: { rate: updated } });
}
