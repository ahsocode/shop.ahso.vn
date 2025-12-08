"use server";

import { NextResponse } from "next/server";
import { getPolicySections } from "@/lib/policy-defs";

export async function GET() {
  const data = await getPolicySections();
  return NextResponse.json({ data });
}
