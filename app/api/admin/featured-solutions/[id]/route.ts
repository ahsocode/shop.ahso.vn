import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyBearerAuth, requireRole } from "@/lib/auth";
import { jsonOk, jsonError, toHttpError } from "@/lib/http";

function getFeaturedSolutionModel() {
  const client = prisma as unknown as Record<string, unknown>;
  const lower = client["featuredsolution"] as typeof prisma.featuredsolution | undefined;
  const camel = client["featuredSolution"] as typeof prisma.featuredsolution | undefined;
  return lower ?? camel;
}

const FeaturedSolutionUpdateSchema = z.object({
  title: z.string().max(200).optional().nullable(),
  description: z.string().max(500).optional().nullable(),
  sortOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
  startDate: z.string().datetime().optional().nullable(),
  endDate: z.string().datetime().optional().nullable(),
});

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const me = await verifyBearerAuth(req);
    requireRole(me, ["ADMIN", "STAFF"]);
    const { id } = await ctx.params;

    const featuredModel = getFeaturedSolutionModel();
    if (!featuredModel) return jsonError("Feature model unavailable", 500);

    const row = await featuredModel.findUnique({
      where: { id },
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

    if (!row) return jsonError("Not Found", 404);

    const { solution, ...rest } = row;
    return jsonOk({
      data: {
        ...rest,
        solution: {
          ...solution,
          categoryName: solution.solutioncategory?.name ?? null,
        },
      },
    });
  } catch (error) {
    const err = toHttpError(error);
    return jsonError(err.message || "Internal Error", err.status || 500);
  }
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const me = await verifyBearerAuth(req);
    requireRole(me, ["ADMIN"]);
    const { id } = await ctx.params;

    const body = await req.json();
    const parsed = FeaturedSolutionUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError("Validation Error", 400, { issues: parsed.error.issues });
    }

    const featuredModel = getFeaturedSolutionModel();
    if (!featuredModel) return jsonError("Feature model unavailable", 500);

    const existing = await featuredModel.findUnique({ where: { id } });
    if (!existing) return jsonError("Not Found", 404);

    const updateInput = parsed.data;
    const updated = await featuredModel.update({
      where: { id },
      data: {
        title: updateInput.title !== undefined ? updateInput.title : undefined,
        description: updateInput.description !== undefined ? updateInput.description : undefined,
        sortOrder: updateInput.sortOrder,
        isActive: updateInput.isActive,
        startDate: updateInput.startDate !== undefined ? (updateInput.startDate ? new Date(updateInput.startDate) : null) : undefined,
        endDate: updateInput.endDate !== undefined ? (updateInput.endDate ? new Date(updateInput.endDate) : null) : undefined,
        updatedAt: new Date(),
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
      where: { id: updated.solutionId },
      data: { isFeatured: Boolean(updated.isActive) },
    });

    const responseData = {
      ...updated,
      solution: {
        ...updated.solution,
        categoryName: updated.solution.solutioncategory?.name ?? null,
      },
    };

    return jsonOk({ data: responseData });
  } catch (error) {
    const err = toHttpError(error);
    return jsonError(err.message || "Internal Error", err.status || 500);
  }
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const me = await verifyBearerAuth(req);
    requireRole(me, ["ADMIN"]);
    const { id } = await ctx.params;

    const featuredModel = getFeaturedSolutionModel();
    if (!featuredModel) return jsonError("Feature model unavailable", 500);

    const existing = await featuredModel.findUnique({
      where: { id },
      select: { solutionId: true },
    });
    if (!existing) return jsonError("Not Found", 404);

    await featuredModel.delete({ where: { id } });
    await prisma.solution.update({
      where: { id: existing.solutionId },
      data: { isFeatured: false },
    });
    return jsonOk({ ok: true });
  } catch (error) {
    const err = toHttpError(error);
    return jsonError(err.message || "Internal Error", err.status || 500);
  }
}
