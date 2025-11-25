// app/api/admin/brands/bulk-import/preview/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyBearerAuth, requireRole } from "@/lib/auth";
import { slugify } from "@/lib/slug";
import { randomUUID } from "crypto";

export const runtime = "nodejs";

type PreviewRow = {
  tempId: string;
  name: string;
  slug: string;
  summary: string | null;
  logoUrl: string | null;
  mode: "create" | "update";
  issues: string[];
};

type CsvRow = Record<string, string>;

function parseCsv(text: string): CsvRow[] {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (!lines.length) return [];
  const [headerLine, ...rows] = lines;
  const headers = headerLine.split(",").map(h => h.trim());

  return rows.map(line => {
    const cols = line.split(",");
    const obj: CsvRow = {};
    headers.forEach((h, i) => {
      obj[h] = (cols[i] ?? "").trim();
    });
    return obj;
  });
}

export async function POST(req: NextRequest) {
  try {
    const me = await verifyBearerAuth(req);
    requireRole(me, ["ADMIN"]);

    const form = await req.formData();
    const file = form.get("file");
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "Missing file" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const text = buffer.toString("utf8");

    // TODO: nếu muốn hỗ trợ .xlsx thì detect theo file.name và parse khác
    const rawRows = parseCsv(text);
    if (!rawRows.length) {
      return NextResponse.json({ error: "Empty file" }, { status: 400 });
    }

    const previewRows: PreviewRow[] = [];

    for (const raw of rawRows) {
      const issues: string[] = [];
      const name = (raw.name ?? "").trim();
      let slug = (raw.slug ?? "").trim();
      const summary = (raw.summary ?? "").trim() || null;
      const logoUrl = (raw.logoUrl ?? "").trim() || null;

      if (!name) issues.push("Thiếu name");

      if (!slug) slug = slugify(name);
      if (!slug) issues.push("Không tạo được slug");

      let mode: "create" | "update" = "create";

      if (slug) {
        const existed = await prisma.brand.findUnique({ where: { slug } });
        if (existed) mode = "update";
      }

      previewRows.push({
        tempId: randomUUID(),
        name,
        slug,
        summary,
        logoUrl,
        mode,
        issues,
      });
    }

    return NextResponse.json({
      ok: true,
      rows: previewRows,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Preview failed";
    console.error("Preview bulk brand error:", err);
    return NextResponse.json(
      { error: "Preview failed", message },
      { status: 500 },
    );
  }
}
