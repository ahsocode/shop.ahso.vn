import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await context.params;
    const decoded = decodeURIComponent(slug);

    const row = await prisma.software.findUnique({
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
        metaTitle: true,
        metaDescription: true,
        canonicalUrl: true,
        category: { select: { id: true, slug: true, name: true } },
      },
    });

    if (!row || row.status !== "PUBLISHED") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ data: row });
  } catch (err) {
    console.error("[GET /api/software/[slug]]", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

