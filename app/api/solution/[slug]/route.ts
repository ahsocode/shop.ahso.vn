import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// (tùy chọn) nếu muốn route luôn dynamic:
// export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ slug: string }> } // 👈 Next 16: params là Promise
) {
  try {
    const { slug } = await context.params; // 👈 phải await
    const decoded = decodeURIComponent(slug);

    const row = await prisma.solution.findUnique({
      where: { slug: decoded },
      select: {
        id: true,
        createdAt: true,
        updatedAt: true,
        status: true,
        slug: true,
        title: true,
        summary: true,
        coverImage: true,
        bodyHtml: true,
        industry: true,
        usecase: true,
        metaTitle: true,
        metaDescription: true,
        canonicalUrl: true,
        category: { select: { id: true, slug: true, name: true } },
        images: {
          select: { id: true, url: true, alt: true, sortOrder: true },
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    if (!row || row.status !== "PUBLISHED") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ data: row });
  } catch (err) {
    console.error("[GET /api/solution/[slug]]", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
