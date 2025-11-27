"use server";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyBearerAuth, requireRole } from "@/lib/auth";
import {
  getOrderNotificationEmail,
  updateOrderNotificationEmail,
} from "@/lib/system-settings";

const UpdateSchema = z.object({
  email: z.string().email(),
});

export async function GET(req: NextRequest) {
  const me = await verifyBearerAuth(req);
  requireRole(me, ["ADMIN"]);
  const email = await getOrderNotificationEmail();
  return NextResponse.json({ data: { email } });
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
  const updated = await updateOrderNotificationEmail(parsed.data.email);
  return NextResponse.json({ data: { email: updated } });
}
