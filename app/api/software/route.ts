import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { softwareWhereInput } from "@/lib/prisma-types";

function toInt(v: string | null, def = 1) {
  const n = v ? Number(v) : NaN;
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : def;
}

// GET /api/software?q=&category=&categoryId=&page=&pageSize=
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();
    const category = (searchParams.get("category") || "").trim(); // category slug
    const categoryId = (searchParams.get("categoryId") || "").trim();
    const page = toInt(searchParams.get("page"), 1);
    const pageSize = toInt(searchParams.get("pageSize"), 20);

    const where: softwareWhereInput = {
      status: "PUBLISHED",
      ...(categoryId && { categoryId }),
      ...(!categoryId && category && { softwarecategory: { is: { slug: category } } }),
      ...(q && {
        OR: [
          { title: { contains: q } },
          { summary: { contains: q } },
          { bodyHtml: { contains: q } },
        ],
      }),
    };

    const [total, rows] = await Promise.all([
      prisma.software.count({ where }),
      prisma.software.findMany({
        where,
        orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          slug: true,
          title: true,
          coverImage: true,
          summary: true,
          isFeatured: true,
          softwarecategory: { select: { name: true, slug: true } },
        },
      }),
    ]);

    return NextResponse.json({
      data: rows.map((r: (typeof rows)[number]) => ({
        id: r.id,
        slug: r.slug,
        title: r.title,
        summary: r.summary ?? null,
        image: r.coverImage ?? null,
        category: r.softwarecategory,
        isFeatured: r.isFeatured ?? false,
      })),
      meta: { total, page, pageSize },
    });
  } catch (e) {
    console.error("GET /api/software error:", e);
    return NextResponse.json(
      { data: [], meta: { total: 0, page: 1, pageSize: 20 }, error: "Internal" },
      { status: 200 }
    );
  }
}

export function OPTIONS() {
  return NextResponse.json(null, { status: 204 });
}
