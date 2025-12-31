import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyBearerAuth, requireRole } from "@/lib/auth";

type Status = "DRAFT" | "PUBLISHED" | "ARCHIVED";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const me = await verifyBearerAuth(req);
    requireRole(me, ["ADMIN"]);

    const { id } = await ctx.params;
    const body = await req.json();
    const status = (body?.status || "DRAFT") as Status;

    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    if (!["DRAFT", "PUBLISHED", "ARCHIVED"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const existing = await prisma.solution.findUnique({ where: { id }, select: { id: true } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const now = new Date();
    const updated = await prisma.solution.update({
      where: { id },
      data: {
        status,
        publishedAt: status === "PUBLISHED" ? now : null,
        updatedAt: now,
      },
      select: {
        id: true,
        status: true,
        publishedAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
