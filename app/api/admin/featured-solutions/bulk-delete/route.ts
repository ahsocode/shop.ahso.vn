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

const BulkDeleteSchema = z.object({
  mode: z.enum(["all", "selected"]),
  ids: z.array(z.string().min(1)).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const me = await verifyBearerAuth(req);
    requireRole(me, ["ADMIN"]);

    const body = await req.json();
    const parsed = BulkDeleteSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError("Validation Error", 400, { issues: parsed.error.issues });
    }

    const model = getFeaturedSolutionModel();
    if (!model) return jsonOk({ deletedIds: [] });

    const { mode, ids } = parsed.data;
    const rows = await model.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: { id: true, solutionId: true },
    });
    if (!rows.length) return jsonOk({ deletedIds: [] });

    const selectedIds = ids ?? [];
    const targets =
      mode === "all"
        ? rows
        : rows.filter((item) => selectedIds.includes(item.id));
    const targetIds = targets.map((item) => item.id);
    const solutionIds = targets.map((item) => item.solutionId);

    await prisma.$transaction([
      model.deleteMany({ where: { id: { in: targetIds } } }),
      prisma.solution.updateMany({
        where: { id: { in: solutionIds } },
        data: { isFeatured: false },
      }),
    ]);

    return jsonOk({ deletedIds: targetIds });
  } catch (error) {
    const err = toHttpError(error);
    return jsonError(err.message || "Internal Error", err.status || 500);
  }
}
