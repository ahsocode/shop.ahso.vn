import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyBearerAuth, requireRole } from "@/lib/auth";
import { jsonOk, jsonError, toHttpError } from "@/lib/http";

function getFeaturedSoftwareModel() {
  const client = prisma as unknown as Record<string, unknown>;
  const lower = client["featuredsoftware"] as typeof prisma.featuredsoftware | undefined;
  const camel = client["featuredSoftware"] as typeof prisma.featuredsoftware | undefined;
  return lower ?? camel;
}

const FeaturedSoftwareUpdateSchema = z.object({
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

    const featuredModel = getFeaturedSoftwareModel();
    if (!featuredModel) return jsonError("Feature model unavailable", 500);

    const row = await featuredModel.findUnique({
      where: { id },
      include: {
        software: {
          select: {
            id: true,
            title: true,
            slug: true,
            coverImage: true,
            status: true,
            softwarecategory: { select: { name: true } },
          },
        },
      },
    });

    if (!row) return jsonError("Not Found", 404);

    const { software, ...rest } = row;
    return jsonOk({
      data: {
        ...rest,
        software: {
          ...software,
          categoryName: software.softwarecategory?.name ?? null,
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
    const parsed = FeaturedSoftwareUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError("Validation Error", 400, { issues: parsed.error.issues });
    }

    const featuredModel = getFeaturedSoftwareModel();
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
        software: {
          select: {
            id: true,
            title: true,
            slug: true,
            coverImage: true,
            status: true,
            softwarecategory: { select: { name: true } },
          },
        },
      },
    });

    await prisma.software.update({
      where: { id: updated.softwareId },
      data: { isFeatured: Boolean(updated.isActive) },
    });

    const responseData = {
      ...updated,
      software: {
        ...updated.software,
        categoryName: updated.software.softwarecategory?.name ?? null,
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

    const featuredModel = getFeaturedSoftwareModel();
    if (!featuredModel) return jsonError("Feature model unavailable", 500);

    const existing = await featuredModel.findUnique({
      where: { id },
      select: { softwareId: true },
    });
    if (!existing) return jsonError("Not Found", 404);

    await featuredModel.delete({ where: { id } });
    await prisma.software.update({
      where: { id: existing.softwareId },
      data: { isFeatured: false },
    });
    return jsonOk({ ok: true });
  } catch (error) {
    const err = toHttpError(error);
    return jsonError(err.message || "Internal Error", err.status || 500);
  }
}
