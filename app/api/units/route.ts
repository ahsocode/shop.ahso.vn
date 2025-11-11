import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const items = await prisma.unitDefinition.findMany({
    orderBy: [{ name: "asc" }],
    select: { id: true, name: true, symbol: true, dimension: true, baseName: true, factorToBase: true }
  });
  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const body = await req.json();
  if (!body.name) return NextResponse.json({ error: "Missing name" }, { status: 400 });

  const created = await prisma.unitDefinition.create({
    data: {
      name: String(body.name),
      symbol: body.symbol ?? null,
      dimension: body.dimension ?? null,
      baseName: body.baseName ?? null,
      factorToBase: body.factorToBase ?? null
    }
  });

  return NextResponse.json(created, { status: 201 });
}
