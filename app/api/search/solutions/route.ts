// app/api/search/solutions/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();
  const industry = (searchParams.get("industry") ?? "").trim();
  const usecase = (searchParams.get("usecase") ?? "").trim();
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get("pageSize") ?? "12", 10)));

  // nới lỏng type để tránh xung đột với prisma client tùy biến
  const where: any = { status: "PUBLISHED" };

  if (industry) where.industry = { equals: industry };
  if (usecase) where.usecase = { contains: usecase, mode: "insensitive" };

  if (q) {
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { summary: { contains: q, mode: "insensitive" } },
      { bodyHtml: { contains: q, mode: "insensitive" } },
      { usecase: { contains: q, mode: "insensitive" } },
    ];
  }

  const select = {
    id: true,
    slug: true,          // ⬅️ cần cho SEO link /shop/solution/[slug]
    title: true,
    coverImage: true,
    summary: true,
    industry: true,
    usecase: true,
    category: { select: { name: true, slug: true } }, // trả thêm tên category
  } as const;

  const [total, rows] = await Promise.all([
    prisma.solution.count({ where }),
    prisma.solution.findMany({
      where,
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select,
    }),
  ]);

  // dùng any để tránh TS suy luận về model đầy đủ (có categoryId/createdAt/...)
  const data = (rows as any[]).map((s) => ({
    id: s.id,
    slug: s.slug,                  // ⬅️ thêm slug trong response
    title: s.title,
    image: s.coverImage,
    summary: s.summary,
    industry: s.industry,
    usecase: s.usecase,
    category: s.category?.name ?? null,
  }));

  return NextResponse.json({
    data,
    meta: { total, page, pageSize },
  });
}
