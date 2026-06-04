import { randomUUID } from "crypto";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyBearerAuth, requireRole } from "@/lib/auth";
import { jsonOk, jsonError, toHttpError, parsePaging } from "@/lib/http";

function getFeaturedSoftwareModel() {
  const client = prisma as unknown as Record<string, unknown>;
  const lower = client["featuredsoftware"] as typeof prisma.featuredsoftware | undefined;
  const camel = client["featuredSoftware"] as typeof prisma.featuredsoftware | undefined;
  return lower ?? camel;
}

const FeaturedSoftwareCreateSchema = z.object({
  softwareId: z.string().uuid(),
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

    const model = getFeaturedSoftwareModel();
    if (!model) {
      console.error("Featured software model not found on Prisma client");
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
          softwareId: true,
          title: true,
          description: true,
          sortOrder: true,
          isActive: true,
          startDate: true,
          endDate: true,
          createdAt: true,
          updatedAt: true,
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
      }),
    ]);

    const data = rows.map((row) => {
      const { software, ...rest } = row;
      return {
        ...rest,
        software: {
          ...software,
          categoryName: software.softwarecategory?.name ?? null,
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
    const parsed = FeaturedSoftwareCreateSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError("Validation Error", 400, { issues: parsed.error.issues });
    }

    const { softwareId, title, description, sortOrder, isActive, startDate, endDate } = parsed.data;

    const software = await prisma.software.findUnique({
      where: { id: softwareId },
      select: { id: true, title: true, status: true },
    });
    if (!software) {
      return jsonError("Software not found", 404);
    }
    if (software.status !== "PUBLISHED") {
      return jsonError("Only published software can be featured", 400);
    }

    const featuredModel = getFeaturedSoftwareModel();
    if (!featuredModel) return jsonError("Featured software model unavailable", 500);

    const existing = await featuredModel.findUnique({ where: { softwareId } });
    if (existing) {
      return jsonError("Software is already featured", 409);
    }

    const now = new Date();
    const created = await featuredModel.create({
      data: {
        id: randomUUID(),
        softwareId,
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
      where: { id: softwareId },
      data: { isFeatured: Boolean(isActive) },
    });

    const data = {
      ...created,
      software: {
        ...created.software,
        categoryName: created.software.softwarecategory?.name ?? null,
      },
    };

    return jsonOk({ data }, 201);
  } catch (error) {
    const err = toHttpError(error);
    return jsonError(err.message || "Internal Error", err.status || 500);
  }
}
