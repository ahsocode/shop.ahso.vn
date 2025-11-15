import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyBearerAuth, requireRole } from "@/lib/auth";
import { jsonOk, jsonError, toHttpError } from "@/lib/http";
import { z } from "zod";

const UpdateSchema = z.object({
  name: z.string().min(1).optional(),
  slug: z.string().trim().optional(),
});

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const me = await verifyBearerAuth(req); requireRole(me, ["ADMIN"]);
    const { id } = await ctx.params;

    const row = await prisma.productSpecDefinition.findUnique({ where: { id } });
    if (!row) return jsonError("Not Found", 404);
    return jsonOk({ data: row });
  } catch (error) {
    const err = toHttpError(error);
    return jsonError(err.message || "Internal Error", err.status || 500);
  }
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const me = await verifyBearerAuth(req); requireRole(me, ["ADMIN"]);
    const { id } = await ctx.params;

    const body = await req.json();
    const parsed = UpdateSchema.safeParse(body);
    if (!parsed.success) return jsonError("Validation Error", 400, { issues: parsed.error.issues });

    const current = await prisma.productSpecDefinition.findUnique({ where: { id } });
    if (!current) return jsonError("Not Found", 404);

    if (parsed.data.slug && parsed.data.slug !== current.slug) {
      const dup = await prisma.productSpecDefinition.findUnique({ where: { slug: parsed.data.slug } });
      if (dup) return jsonError("Slug already exists", 409);
    }

    const updated = await prisma.productSpecDefinition.update({
      where: { id },
      data: parsed.data,
    });

    return jsonOk({ data: updated });
  } catch (error) {
    const err = toHttpError(error);
    return jsonError(err.message || "Internal Error", err.status || 500);
  }
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const me = await verifyBearerAuth(req); requireRole(me, ["ADMIN"]);
    const { id } = await ctx.params;

    await prisma.productSpecDefinition.delete({ where: { id } });
    return jsonOk({ ok: true });
  } catch (error) {
    const err = toHttpError(error);
    if (err.code === "P2003") return jsonError("Cannot delete: spec-def in use", 409);
    return jsonError(err.message || "Internal Error", err.status || 500);
  }
}
