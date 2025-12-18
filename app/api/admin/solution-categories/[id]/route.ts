import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyBearerAuth, requireRole } from "@/lib/auth";
import { slugify } from "@/lib/slug";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const me = await verifyBearerAuth(req);
    requireRole(me, ["ADMIN"]);

    const { id } = await ctx.params;
    const body = await req.json();
    const name = String(body?.name || "").trim();
    const description = String(body?.description || "").trim();

    if (!name) {
      return NextResponse.json({ error: "Missing name" }, { status: 400 });
    }

    const slug = slugify(name);
    const updated = await prisma.solutioncategory.update({
      where: { id },
      data: {
        name,
        slug,
        description: description || null,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const me = await verifyBearerAuth(req);
    requireRole(me, ["ADMIN"]);

    const { id } = await ctx.params;
    await prisma.solutioncategory.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
