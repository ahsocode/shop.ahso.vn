import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? undefined;

  const where = q ? { OR: [{ name: { contains: q } }, { slug: { contains: q } }] } : {};

  const items = await prisma.productSpecDefinition.findMany({
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

  const created = await prisma.productSpecDefinition.create({
    data: {
      slug,
      name: body.name
    }
  });

  return NextResponse.json(created, { status: 201 });
}
