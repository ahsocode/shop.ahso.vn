import { randomUUID } from "crypto";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyBearerAuth, requireRole } from "@/lib/auth";
import { jsonOk, jsonError, toHttpError, parsePaging } from "@/lib/http";

function getFeaturedSolutionModel() {
  const client = prisma as unknown as Record<string, unknown>;
  const lower = client["featuredsolution"] as typeof prisma.featuredsolution | undefined;
  const camel = client["featuredSolution"] as typeof prisma.featuredsolution | undefined;
  return lower ?? camel;
}

const FeaturedSolutionCreateSchema = z.object({
  solutionId: z.string().uuid(),
  title: z.string().max(200).optional().nullable(),
  description: z.string().max(500).optional().nullable(),
  sortOrder: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
  startDate: z.string().datetime().optional().nullable(),
  endDate: z.string().datetime().optional().nullable(),
});

export async function GET(req: NextRequest) {
  try {
    const me = await verifyBearerAuth(req);
    requireRole(me, ["ADMIN", "STAFF"]);

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const { page, pageSize, skip, take } = parsePaging(req, { defaultPageSize: 20 });

    const where = {
      ...(status === "active" && { isActive: true }),
      ...(status === "inactive" && { isActive: false }),
    };

    const model = getFeaturedSolutionModel();
    if (!model) {
      console.error("Featured solution model not found on Prisma client");
      return jsonOk({ data: [], meta: { total: 0, page, pageSize } });
    }

    const [total, rows] = await Promise.all([
      model.count({ where }),
      model.findMany({
        where,
        orderBy: { sortOrder: "asc" },
        skip,
        take,
        select: {
          id: true,
          solutionId: true,
          title: true,
          description: true,
          sortOrder: true,
          isActive: true,
          startDate: true,
          endDate: true,
          createdAt: true,
          updatedAt: true,
          solution: {
            select: {
              id: true,
              title: true,
              slug: true,
              coverImage: true,
              status: true,
              solutioncategory: { select: { name: true } },
            },
          },
        },
      }),
    ]);

    const data = rows.map((row) => {
      const { solution, ...rest } = row;
      return {
        ...rest,
        solution: {
          ...solution,
          categoryName: solution.solutioncategory?.name ?? null,
        },
      };
    });

    return jsonOk({ data, meta: { total, page, pageSize } });
  } catch (error) {
    const err = toHttpError(error);
    return jsonError(err.message || "Internal Error", err.status || 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const me = await verifyBearerAuth(req);
    requireRole(me, ["ADMIN"]);

    const body = await req.json();
    const parsed = FeaturedSolutionCreateSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError("Validation Error", 400, { issues: parsed.error.issues });
    }

    const { solutionId, title, description, sortOrder, isActive, startDate, endDate } = parsed.data;

    const solution = await prisma.solution.findUnique({
      where: { id: solutionId },
      select: { id: true, title: true },
    });
    if (!solution) {
      return jsonError("Solution not found", 404);
    }

    const featuredModel = getFeaturedSolutionModel();
    if (!featuredModel) return jsonError("Featured solution model unavailable", 500);

    const existing = await featuredModel.findUnique({ where: { solutionId } });
    if (existing) {
      return jsonError("Solution is already featured", 409);
    }

    const now = new Date();
    const created = await featuredModel.create({
      data: {
        id: randomUUID(),
        solutionId,
        title: title ?? null,
        description: description ?? null,
        sortOrder,
        isActive,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        createdAt: now,
        updatedAt: now,
      },
      include: {
        solution: {
          select: {
            id: true,
            title: true,
            slug: true,
            coverImage: true,
            status: true,
            solutioncategory: { select: { name: true } },
          },
        },
      },
    });

    await prisma.solution.update({
      where: { id: solutionId },
      data: { isFeatured: Boolean(isActive) },
    });

    const data = {
      ...created,
      solution: {
        ...created.solution,
        categoryName: created.solution.solutioncategory?.name ?? null,
      },
    };

    return jsonOk({ data }, 201);
  } catch (error) {
    const err = toHttpError(error);
    return jsonError(err.message || "Internal Error", err.status || 500);
  }
}
