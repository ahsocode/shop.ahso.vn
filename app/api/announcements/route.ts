"use server";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const data = await prisma.siteannouncement.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ data });
}
