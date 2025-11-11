import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const categorySlug = searchParams.get("category") ?? undefined;
  const q = searchParams.get("q") ?? undefined;

  const where: any = {};
  if (categorySlug) where.category = { slug: categorySlug };
  if (q) where.OR = [{ name: { contains: q } }, { slug: { contains: q } }];

  const items = await prisma.productType.findMany({
    where,
    orderBy: [{ productCount: "desc" }, { name: "asc" }],
    include: {
      category: { select: { slug: true, name: true } }
    }
  });

  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const body = await req.json();
  if (!body.name || !body.categorySlug) {
    return NextResponse.json({ error: "Missing name or categorySlug" }, { status: 400 });
  }

  const cat = await prisma.productCategory.findUnique({ where: { slug: body.categorySlug } });
  if (!cat) return NextResponse.json({ error: "categorySlug not found" }, { status: 400 });

  const slug = body.slug ? String(body.slug) : slugify(body.name);

  const created = await prisma.productType.create({
    data: {
      slug,
      name: body.name,
      coverImage: body.coverImage ?? null,
      description: body.description ?? null,
      categoryId: cat.id
    }
  });

  return NextResponse.json(created, { status: 201 });
}
