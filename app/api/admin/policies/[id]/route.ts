"use server";

import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { verifyBearerAuth, requireRole } from "@/lib/auth";
import { deletePolicySection, updatePolicySection } from "@/lib/policy-defs";

const PolicySchema = z.object({
  name: z.string().trim().min(1, "Tên chính sách là bắt buộc.").max(255),
  content: z.string().max(50000).default(""),
});

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const me = await verifyBearerAuth(req);
  requireRole(me, ["ADMIN"]);

  const { id } = await context.params;
  const body = await req.json().catch(() => null);
  const parsed = PolicySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "INVALID_INPUT", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  try {
    const updated = await updatePolicySection(id, parsed.data);
    return NextResponse.json({ data: updated });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "POLICY_NOT_FOUND" }, { status: 404 });
    }
    throw error;
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const me = await verifyBearerAuth(req);
  requireRole(me, ["ADMIN"]);

  const { id } = await context.params;

  try {
    await deletePolicySection(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "POLICY_NOT_FOUND" }, { status: 404 });
    }
    throw error;
  }
}
