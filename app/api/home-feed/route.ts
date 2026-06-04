import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function getFeaturedSolutionModel() {
  const client = prisma as unknown as Record<string, unknown>;
  const lower = client["featuredsolution"] as typeof prisma.featuredsolution | undefined;
  const camel = client["featuredSolution"] as typeof prisma.featuredsolution | undefined;
  return lower ?? camel;
}

function getFeaturedSoftwareModel() {
  const client = prisma as unknown as Record<string, unknown>;
  const lower = client["featuredsoftware"] as typeof prisma.featuredsoftware | undefined;
  const camel = client["featuredSoftware"] as typeof prisma.featuredsoftware | undefined;
  return lower ?? camel;
}

export async function GET() {
  const now = new Date();

  try {
    const activeWindow = {
      isActive: true,
      OR: [
        { startDate: null, endDate: null },
        { startDate: null, endDate: { gte: now } },
        { startDate: { lte: now }, endDate: null },
        { startDate: { lte: now }, endDate: { gte: now } },
      ],
    };

    const featuredSolutionModel = getFeaturedSolutionModel();
    const featuredSoftwareModel = getFeaturedSoftwareModel();

    const [hero, featuredSolutions, featuredSoftwares] = await Promise.all([
      prisma.herobanner.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          imageUrl: true,
          title: true,
          content: true,
          ctaLabel: true,
          ctaHref: true,
          sortOrder: true,
          overlayOn: true,
          overlayColor: true,
          textColor: true,
          textPosition: true,
        },
      }),
      featuredSolutionModel
        ? featuredSolutionModel.findMany({
            where: {
              ...activeWindow,
              solution: { status: "PUBLISHED" },
            },
            orderBy: { sortOrder: "asc" },
            take: 10,
            select: {
              id: true,
              title: true,
              description: true,
              sortOrder: true,
              solution: {
                select: {
                  id: true,
                  title: true,
                  slug: true,
                  summary: true,
                  coverImage: true,
                  status: true,
                  solutioncategory: { select: { name: true } },
                },
              },
            },
          })
        : [],
      featuredSoftwareModel
        ? featuredSoftwareModel.findMany({
            where: {
              ...activeWindow,
              software: { status: "PUBLISHED" },
            },
            orderBy: { sortOrder: "asc" },
            take: 10,
            select: {
              id: true,
              title: true,
              description: true,
              sortOrder: true,
              software: {
                select: {
                  id: true,
                  title: true,
                  slug: true,
                  summary: true,
                  coverImage: true,
                  status: true,
                  softwarecategory: { select: { name: true } },
                },
              },
            },
          })
        : [],
    ]);

    const data = {
      hero,
      featured: [],
      featuredSolutions: featuredSolutions.map((item) => ({
        id: item.id,
        title: item.title || item.solution?.title || "",
        description: item.description ?? item.solution?.summary ?? null,
        sortOrder: item.sortOrder,
        solution: item.solution
          ? {
              id: item.solution.id,
              title: item.solution.title,
              slug: item.solution.slug,
              summary: item.solution.summary,
              image: item.solution.coverImage || "/logo.png",
              categoryName: item.solution.solutioncategory?.name ?? null,
            }
          : null,
      })),
      featuredSoftwares: featuredSoftwares.map((item) => ({
        id: item.id,
        title: item.title || item.software?.title || "",
        description: item.description ?? item.software?.summary ?? null,
        sortOrder: item.sortOrder,
        software: item.software
          ? {
              id: item.software.id,
              title: item.software.title,
              slug: item.software.slug,
              summary: item.software.summary,
              image: item.software.coverImage || "/logo.png",
              categoryName: item.software.softwarecategory?.name ?? null,
            }
          : null,
      })),
      bestSellers: [],
      topRated: [],
      newArrivals: [],
    };

    return NextResponse.json({ data });
  } catch (error) {
    console.error("Home feed error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
