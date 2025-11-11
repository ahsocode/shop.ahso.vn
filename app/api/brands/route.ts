import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? undefined;

  const where = q
    ? { OR: [{ name: { contains: q } }, { slug: { contains: q } }] }
    : {};

  const items = await prisma.brand.findMany({
    where,
    orderBy: [{ productCount: "desc" }, { name: "asc" }],
    select: { id: true, slug: true, name: true, logoUrl: true, summary: true, productCount: true }
  });

  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const body = await req.json();
  const name: string = body.name;
  if (!name) return NextResponse.json({ error: "Missing name" }, { status: 400 });

  const slug = body.slug ? String(body.slug) : slugify(name);

  const brand = await prisma.brand.create({
    data: {
      slug,
      name,
      logoUrl: body.logoUrl ?? null,
      summary: body.summary ?? null
    }
  });

  return NextResponse.json(brand, { status: 201 });
}
