"use server";

import { NextResponse } from "next/server";
import { getDefaultTaxRate } from "@/lib/system-settings";

export async function GET() {
  const rate = await getDefaultTaxRate();
  return NextResponse.json({ data: { rate } });
}
