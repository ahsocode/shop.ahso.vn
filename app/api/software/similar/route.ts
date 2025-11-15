import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const revalidate = 60;

function toLimit(v: string | null, def = 12, max = 24) {
  const n = v ? Number(v) : NaN;
  return Number.isFinite(n) && n > 0 ? Math.min(n, max) : def;
}

// GET /api/software/similar?category=slug-or-id&exclude=slug-or-id&limit=12
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category"); // slug or id
    const exclude = searchParams.get("exclude");  // slug or id
    const limit = toLimit(searchParams.get("limit"));

    if (!category) {
      return NextResponse.json(
        { error: "Missing category parameter" },
        { status: 400 }
      );
    }

    // Build category filter allowing both slug or id
    const categoryFilter: Prisma.SoftwareWhereInput =
      category.length > 20
        ? { categoryId: category }
        : { category: { is: { slug: category } } };

    const rows = await prisma.software.findMany({
      where: {
        status: "PUBLISHED",
        ...categoryFilter,
        AND: exclude ? [{ slug: { not: exclude } }, { id: { not: exclude } }] : undefined,
      },
      take: limit,
      orderBy: [{ updatedAt: "desc" }],
      select: {
        id: true,
        slug: true,
        title: true,
        summary: true,
        coverImage: true,
      },
    });

    const data = rows.map((r) => ({
      id: r.id,
      slug: r.slug,
      title: r.title,
      summary: r.summary ?? null,
      image: r.coverImage ?? null,
    }));

    return NextResponse.json({
      data,
      meta: { category, exclude, limit, total: data.length },
    });
  } catch (e) {
    console.error("GET /api/software/similar error:", e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
