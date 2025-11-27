"use server";

import { NextRequest, NextResponse } from "next/server";
import { verifyBearerAuth, requireRole } from "@/lib/auth";
import { getPolicySections } from "@/lib/policy-defs";

export async function GET(req: NextRequest) {
  const me = await verifyBearerAuth(req);
  requireRole(me, ["ADMIN", "STAFF"]);
  const data = await getPolicySections();
  return NextResponse.json({ data });
}
