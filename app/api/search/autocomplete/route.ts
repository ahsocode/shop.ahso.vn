import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Suggestion = {
  type: "software" | "solution" | "category" | "popular" | "search";
  text: string;
  subtext?: string;
  url?: string;
  image?: string | null;
  icon?: string;
};

export const dynamic = "force-dynamic";

const popularSearches = ["ERP", "CRM", "Quản lý kho", "Bán hàng", "Sản xuất", "Tự động hóa"];

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q")?.trim() || "";
    const limit = Math.min(Number(searchParams.get("limit") || "10"), 20);

    if (!query || query.length < 2) {
      return NextResponse.json({
        success: true,
        data: {
          suggestions: popularSearches.slice(0, limit).map((text) => ({
            type: "popular",
            text,
            icon: "trending",
            url: `/software?q=${encodeURIComponent(text)}`,
          })),
        },
        meta: { query: "", count: Math.min(popularSearches.length, limit) },
      });
    }

    const [softwares, solutions, softwareCategories, solutionCategories] = await Promise.all([
      prisma.software.findMany({
        where: {
          status: "PUBLISHED",
          OR: [
            { title: { contains: query, mode: "insensitive" } },
            { summary: { contains: query, mode: "insensitive" } },
          ],
        },
        take: 4,
        select: { title: true, slug: true, summary: true, coverImage: true },
        orderBy: { updatedAt: "desc" },
      }),
      prisma.solution.findMany({
        where: {
          status: "PUBLISHED",
          OR: [
            { title: { contains: query, mode: "insensitive" } },
            { summary: { contains: query, mode: "insensitive" } },
          ],
        },
        take: 4,
        select: { title: true, slug: true, summary: true, coverImage: true },
        orderBy: { updatedAt: "desc" },
      }),
      prisma.softwarecategory.findMany({
        where: {
          isActive: true,
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { description: { contains: query, mode: "insensitive" } },
          ],
        },
        take: 3,
        select: { name: true, slug: true, image: true },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      }),
      prisma.solutioncategory.findMany({
        where: {
          isActive: true,
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { description: { contains: query, mode: "insensitive" } },
          ],
        },
        take: 3,
        select: { name: true, slug: true, image: true },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      }),
    ]);

    const suggestions: Suggestion[] = [
      {
        type: "search",
        text: query,
        subtext: `Tìm kiếm "${query}"`,
        url: `/software?q=${encodeURIComponent(query)}`,
        icon: "search",
      },
      ...softwares.map((item) => ({
        type: "software" as const,
        text: item.title,
        subtext: item.summary ?? "Phần mềm",
        url: `/software/${item.slug}`,
        image: item.coverImage,
        icon: "grid",
      })),
      ...solutions.map((item) => ({
        type: "solution" as const,
        text: item.title,
        subtext: item.summary ?? "Giải pháp",
        url: `/solutions/${item.slug}`,
        image: item.coverImage,
        icon: "award",
      })),
      ...softwareCategories.map((item) => ({
        type: "category" as const,
        text: item.name,
        subtext: "Danh mục phần mềm",
        url: `/software?category=${item.slug}`,
        image: item.image,
        icon: "grid",
      })),
      ...solutionCategories.map((item) => ({
        type: "category" as const,
        text: item.name,
        subtext: "Danh mục giải pháp",
        url: `/solutions?category=${item.slug}`,
        image: item.image,
        icon: "grid",
      })),
    ];

    return NextResponse.json({
      success: true,
      data: { suggestions: suggestions.slice(0, limit), query },
      meta: { count: Math.min(suggestions.length, limit) },
    });
  } catch (error) {
    console.error("Autocomplete API error:", error);
    return NextResponse.json({ success: false, error: "Autocomplete failed", data: { suggestions: [] } }, { status: 500 });
  }
}
