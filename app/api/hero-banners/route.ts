"use server";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const data = await prisma.herobanner.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    select: {
      id: true,
      imageUrl: true,
      title: true,
      content: true,
      ctaLabel: true,
      ctaHref: true,
      sortOrder: true,
      overlayOn: true,
      overlayColor: true,
      textPosition: true,
    },
  });
  return NextResponse.json({ data });
}
