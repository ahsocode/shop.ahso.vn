import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client/index";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? undefined;

  const where: Prisma.productspecdefinitionWhereInput = {
    ...(q && {
      OR: [
        { name: { contains: q } },
        { slug: { contains: q } },
      ],
    }),
  };

  const items = await prisma.productspecdefinition.findMany({
    where,
    orderBy: [{ name: "asc" }],
    select: { id: true, slug: true, name: true }
  });

  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const body = await req.json();
  if (!body.name) return NextResponse.json({ error: "Missing name" }, { status: 400 });

  const slug = body.slug ? String(body.slug) : slugify(body.name);

  const now = new Date();
  const created = await prisma.productspecdefinition.create({
    data: {
      id: randomUUID(),
      slug,
      name: body.name,
      createdAt: now,
      updatedAt: now,
    }
  });

  return NextResponse.json(created, { status: 201 });
}
