// app/api/solutions/similar/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // hoặc import { PrismaClient } from "@prisma/client"

export const revalidate = 60; // ISR nhẹ

function toLimit(v: string | null, def = 12, max = 24) {
  const n = v ? Number(v) : NaN;
  return Number.isFinite(n) && n > 0 ? Math.min(n, max) : def;
}

/**
 * GET /api/solutions/similar?industry=electronics&exclude=slug-or-id&limit=12
 * - industry: (bắt buộc) tên ngành (string) để lọc cùng ngành
 * - exclude : (tuỳ chọn) slug hoặc id giải pháp hiện tại để loại trừ
 * - limit   : (tuỳ chọn) mặc định 12, tối đa 24
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const industry = searchParams.get("industry");
    const exclude = searchParams.get("exclude"); // slug hoặc id
    const limit = toLimit(searchParams.get("limit"));

    if (!industry) {
      return NextResponse.json(
        { error: "Missing industry parameter" },
        { status: 400 }
      );
    }

    const rows = await prisma.solution.findMany({
      where: {
        status: "PUBLISHED",      // enum PublishStatus
        industry,                 // cùng ngành
        AND: exclude
          ? [
              {
                OR: [
                  { slug: { not: exclude } }, // loại trừ theo slug
                  { id: { not: exclude } },   // hoặc theo id
                ],
              },
            ]
          : undefined,
      },
      take: limit,
      orderBy: [{ updatedAt: "desc" }],
      select: {
        id: true,
        slug: true,
        title: true,
        summary: true,
        coverImage: true,
        images: {
          select: { url: true, sortOrder: true },
          orderBy: { sortOrder: "asc" },
          take: 1,
        },
      },
    });

    const data = rows.map((r) => ({
      id: r.id,
      slug: r.slug,
      title: r.title,
      summary: r.summary ?? null,
      image: r.coverImage ?? r.images?.[0]?.url ?? null,
    }));

    return NextResponse.json({
      data,
      meta: { industry, exclude, limit, total: data.length },
    });
  } catch (e) {
    console.error("GET /api/solutions/similar error:", e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
