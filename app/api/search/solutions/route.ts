// app/api/search/solutions/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function toInt(v: string | null, def = 1) {
  const n = v ? Number(v) : NaN;
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : def;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();
    const industry = (searchParams.get("industry") || "").trim();
    const usecase = (searchParams.get("usecase") || "").trim();
    const page = toInt(searchParams.get("page"), 1);
    const pageSize = toInt(searchParams.get("pageSize"), 12);

    const where: any = {
      status: "PUBLISHED",
    };

    if (industry) where.industry = industry;   // so khớp đúng giá trị
    if (usecase) where.usecase = usecase;

    if (q) {
      // ❌ KHÔNG dùng mode: "insensitive" (DB/Prisma bạn không hỗ trợ)
      // Nếu DB của bạn là MySQL với collation *_ci thì đã case-insensitive sẵn
      where.OR = [
        { title:   { contains: q } },
        { summary: { contains: q } },
        { bodyHtml:{ contains: q } },
        { usecase: { contains: q } },
      ];
    }

    const [total, rows] = await Promise.all([
      prisma.solution.count({ where }),     // đếm
      prisma.solution.findMany({
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
          industry: true,
          usecase: true,
          category: { select: { name: true, slug: true } },
        },
      }),
    ]);

    return NextResponse.json({
      data: rows.map((r) => ({
        id: r.id,
        slug: r.slug,
        title: r.title,
        summary: r.summary,
        industry: r.industry,
        usecase: r.usecase,
        image: r.coverImage ?? null,
        category: r.category,
      })),
      meta: { total, page, pageSize },
    });
  } catch (e) {
    console.error("GET /api/search/solutions error:", e);
    // Luôn trả JSON để client không crash
    return NextResponse.json(
      { data: [], meta: { total: 0, page: 1, pageSize: 12 }, error: "Internal" },
      { status: 200 }
    );
  }
}
