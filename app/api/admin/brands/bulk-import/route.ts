// app/api/admin/brands/bulk-import/route.ts
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { verifyBearerAuth, requireRole } from "@/lib/auth";
import { slugify } from "@/lib/slug";

export const runtime = "nodejs";

type CsvRow = {
  name?: string;
  slug?: string;
  summary?: string;
  logoUrl?: string;
};

type PreviewRow = {
  tempId: string;
  name: string;
  slug: string;
  summary: string;
  logoUrl: string;
  mode: "create" | "update";
  issues: string[];
};

type CommitRowInput = {
  tempId: string;
  name?: string | null;
  slug?: string | null;
  summary?: string | null;
  logoUrl?: string | null;
};

export async function POST(req: NextRequest) {
  const me = await verifyBearerAuth(req);
  requireRole(me, ["ADMIN"]);

  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("mode") ?? "preview";

  if (mode === "preview") {
    return handlePreview(req);
  }
  if (mode === "commit") {
    return handleCommit(req);
  }

  return NextResponse.json(
    { error: "Invalid mode" },
    { status: 400 },
  );
}

// =============== PREVIEW ===============

async function handlePreview(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "Missing file" },
        { status: 400 },
      );
    }

    const text = await file.text();
    const csvRows = parseCsv(text);

    if (!csvRows.length) {
      return NextResponse.json(
        { rows: [] },
        { status: 200 },
      );
    }

    // Chuẩn hóa slug & gom list để query 1 lần
    const normalized = csvRows.map((row) => {
      const rawName = (row.name ?? "").trim();
      const rawSlug = (row.slug ?? "").trim();
      const slug =
        rawSlug || (rawName ? slugify(rawName) : "");
      return {
        ...row,
        name: rawName,
        slug,
        summary: (row.summary ?? "").trim(),
        logoUrl: (row.logoUrl ?? "").trim(),
      };
    });

    const slugList = Array.from(
      new Set(
        normalized
          .map((r) => r.slug)
          .filter((s) => s && s.length > 0),
      ),
    );

    const existingBrands = slugList.length
      ? await prisma.brand.findMany({
          where: { slug: { in: slugList } },
        })
      : [];

    const existingMap = new Map(
      existingBrands.map((b) => [b.slug, b]),
    );

    const previewRows: PreviewRow[] = normalized.map(
      (row, index) => {
        const existing = row.slug
          ? existingMap.get(row.slug)
          : undefined;

        const mode: "create" | "update" = existing
          ? "update"
          : "create";

        // === CHỖ NÀY: merge CSV với DB cho preview ===
        const mergedName =
          row.name || existing?.name || "";
        const mergedSlug =
          row.slug || existing?.slug || "";
        const mergedSummary =
          row.summary || existing?.summary || "";
        const mergedLogoUrl =
          row.logoUrl || existing?.logoUrl || "";

        const issues: string[] = [];
        if (!mergedName) {
          issues.push("Thiếu name");
        }
        if (!mergedSlug) {
          issues.push("Thiếu slug");
        }

        return {
          tempId: `row_${index}_${Date.now()}`,
          name: mergedName,
          slug: mergedSlug,
          summary: mergedSummary,
          logoUrl: mergedLogoUrl,
          mode,
          issues,
        };
      },
    );

    return NextResponse.json(
      { rows: previewRows },
      { status: 200 },
    );
  } catch (err) {
    console.error("bulk-import preview error", err);
    return NextResponse.json(
      { error: "Preview failed" },
      { status: 500 },
    );
  }
}

// =============== COMMIT ===============

async function handleCommit(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      rows: CommitRowInput[];
    };

    const rows = body.rows ?? [];
    if (!rows.length) {
      return NextResponse.json(
        { results: [] },
        { status: 200 },
      );
    }

    // Chuẩn hóa slug & gom để query 1 lần
    const normalized = rows.map((row) => {
      const name = (row.name ?? "").trim();
      const slugRaw = (row.slug ?? "").trim();
      const slug =
        slugRaw || (name ? slugify(name) : "");
      return {
        ...row,
        name: name || undefined,
        slug: slug || undefined,
        summary:
          row.summary !== null && row.summary !== undefined
            ? row.summary
            : undefined,
        logoUrl:
          row.logoUrl !== null && row.logoUrl !== undefined
            ? row.logoUrl
            : undefined,
      };
    });

    const slugList = Array.from(
      new Set(
        normalized
          .map((r) => r.slug)
          .filter((s): s is string => !!s),
      ),
    );

    const existingBrands = slugList.length
      ? await prisma.brand.findMany({
          where: { slug: { in: slugList } },
        })
      : [];

    const existingMap = new Map(
      existingBrands.map((b) => [b.slug, b]),
    );

    const results: { tempId: string; brandId: string }[] =
      [];

    for (const row of normalized) {
      const { tempId, name, slug } = row;

      // Không có name & slug thì bỏ qua
      if (!name && !slug) continue;

      const now = new Date();
      const keySlug =
        slug || (name ? slugify(name) : undefined);

      if (!keySlug) continue;

      const existing = existingMap.get(keySlug);

      if (!existing) {
        // ===== CREATE =====
        if (!name) {
          // tạo mới mà không có name thì skip
          continue;
        }

        const created = await prisma.brand.create({
          data: {
            id: randomUUID(),
            name,
            slug: keySlug,
            summary:
              row.summary && row.summary.trim().length
                ? row.summary.trim()
                : null,
            logoUrl:
              row.logoUrl && row.logoUrl.trim().length
                ? row.logoUrl.trim()
                : null,
            createdAt: now,
            updatedAt: now,
          },
        });

        results.push({ tempId, brandId: created.id });
      } else {
        // ===== UPDATE =====
        const data: Record<string, unknown> = {
          updatedAt: now,
        };

        // === QUAN TRỌNG: chỉ update field nào có giá trị KHÁC RỖNG ===
        // name: chỉ set nếu có string non-empty
        if (name && name.trim().length) {
          data.name = name.trim();
        }

        // slug: cho phép đổi slug nếu khác & non-empty, và không trùng brand khác
        if (slug && slug.trim().length && slug !== existing.slug) {
          const dup = await prisma.brand.findUnique({
            where: { slug },
          });
          if (!dup) {
            data.slug = slug.trim();
          }
        }

        // summary: nếu null/"" => KHÔNG set => giữ DB
        if (
          row.summary !== undefined &&
          row.summary !== null &&
          row.summary.trim().length > 0
        ) {
          data.summary = row.summary.trim();
        }

        // logoUrl: nếu null/"" => KHÔNG set => giữ DB
        if (
          row.logoUrl !== undefined &&
          row.logoUrl !== null &&
          row.logoUrl.trim().length > 0
        ) {
          data.logoUrl = row.logoUrl.trim();
        }

        // Nếu chỉ có updatedAt thì cũng update cho gọn,
        // hoặc có thể bỏ nếu ông không muốn đổi timestamp.
        const updated = await prisma.brand.update({
          where: { id: existing.id },
          data,
        });

        results.push({ tempId, brandId: updated.id });
      }
    }

    return NextResponse.json(
      { results },
      { status: 200 },
    );
  } catch (err) {
    console.error("bulk-import commit error", err);
    return NextResponse.json(
      { error: "Commit failed" },
      { status: 500 },
    );
  }
}

// =============== CSV PARSER ===============

function parseCsv(text: string): CsvRow[] {
  const clean = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = clean
    .split("\n")
    .map((l) => l.trimEnd())
    .filter((l) => l.length > 0);

  if (!lines.length) return [];

  const header = lines[0]
    .split(",")
    .map((h) => h.trim().replace(/^"|"$/g, "").toLowerCase());

  const idxName = header.indexOf("name");
  const idxSlug = header.indexOf("slug");
  const idxSummary = header.indexOf("summary");
  const idxLogoUrl = header.indexOf("logourl");

  const rows: CsvRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const raw = lines[i];
    if (!raw.trim()) continue;

    const cols = splitCsvLine(raw);
    const row: CsvRow = {};

    if (idxName >= 0 && idxName < cols.length)
      row.name = cols[idxName];
    if (idxSlug >= 0 && idxSlug < cols.length)
      row.slug = cols[idxSlug];
    if (idxSummary >= 0 && idxSummary < cols.length)
      row.summary = cols[idxSummary];
    if (idxLogoUrl >= 0 && idxLogoUrl < cols.length)
      row.logoUrl = cols[idxLogoUrl];

    // bỏ luôn dòng toàn rỗng
    if (
      !row.name &&
      !row.slug &&
      !row.summary &&
      !row.logoUrl
    ) {
      continue;
    }

    rows.push(row);
  }

  return rows;
}

// Tách 1 dòng CSV đơn giản, hỗ trợ "a,b,"c,d"" kiểu cơ bản
function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);

  return result.map((s) =>
    s.trim().replace(/^"|"$/g, ""),
  );
}
