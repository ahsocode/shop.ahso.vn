import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const revalidate = 60;

function toLimit(v: string | null, def = 12, max = 24) {
  const n = v ? Number(v) : NaN;
  return Number.isFinite(n) && n > 0 ? Math.min(n, max) : def;
}

/**
 * GET /api/solution/similar?industry=electronics&exclude=slug-or-id&limit=12
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
        status: "PUBLISHED",
        industry: industry, // dữ liệu đã chuẩn hóa theo DB
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
        industry: true, // ⬅️ thêm để hiển thị
        usecase: true,  // ⬅️ thêm để hiển thị (làm "Phân loại")
      },
    });

    const data = rows.map((r) => ({
      id: r.id,
      slug: r.slug,
      title: r.title,
      summary: r.summary ?? null,
      image: r.coverImage ?? null,
      industry: r.industry ?? null,
      usecase: r.usecase ?? null,
    }));

    return NextResponse.json({
      data,
      meta: { industry, exclude, limit, total: data.length },
    });
  } catch (e) {
    console.error("GET /api/solution/similar error:", e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
