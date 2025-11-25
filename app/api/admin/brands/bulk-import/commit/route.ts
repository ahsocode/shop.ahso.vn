// app/api/admin/brands/bulk-import/commit/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyBearerAuth, requireRole } from "@/lib/auth";
import { slugify } from "@/lib/slug";
import { randomUUID } from "crypto";

export const runtime = "nodejs";

type CommitRow = {
  tempId: string;
  name: string;
  slug: string;
  summary: string | null;
  logoUrl: string | null;
};

export async function POST(req: NextRequest) {
  try {
    const me = await verifyBearerAuth(req);
    requireRole(me, ["ADMIN"]);

    const body = (await req.json()) as { rows: CommitRow[] | undefined };
    const rows = body.rows ?? [];
    if (!rows.length) {
      return NextResponse.json({ error: "No rows" }, { status: 400 });
    }

    const results: {
      tempId: string;
      brandId: string;
      action: "created" | "updated";
    }[] = [];

    await prisma.$transaction(async (tx) => {
      for (const row of rows) {
        const name = row.name.trim();
        let slug = row.slug.trim();
        const summary = row.summary?.trim() || null;
        const logoUrl = row.logoUrl?.trim() || null;

        if (!name) throw new Error(`Row tempId=${row.tempId} thiếu name`);

        if (!slug) slug = slugify(name);
        if (!slug) throw new Error(`Row tempId=${row.tempId} không tạo được slug`);

        const existed = await tx.brand.findUnique({ where: { slug } });

        if (!existed) {
          const created = await tx.brand.create({
            data: {
              id: randomUUID(),
              name,
              slug,
              summary,
              logoUrl,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          });
          results.push({
            tempId: row.tempId,
            brandId: created.id,
            action: "created",
          });
        } else {
          const updated = await tx.brand.update({
            where: { slug },
            data: {
              name,
              summary,
              logoUrl,
              updatedAt: new Date(),
            },
          });
          results.push({
            tempId: row.tempId,
            brandId: updated.id,
            action: "updated",
          });
        }
      }
    });

    return NextResponse.json({
      ok: true,
      results,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Commit failed";
    console.error("Commit bulk brand error:", err);
    return NextResponse.json(
      { error: "Commit failed", message },
      { status: 500 },
    );
  }
}
