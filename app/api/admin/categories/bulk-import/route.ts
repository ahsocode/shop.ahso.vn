import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyBearerAuth, requireRole } from "@/lib/auth";
import { slugify } from "@/lib/slug";

export const runtime = "nodejs";

type CsvRow = {
  name?: string;
  slug?: string;
  description?: string;
  coverImage?: string;
};

type PreviewRow = {
  tempId: string;
  name: string;
  slug: string;
  description: string;
  coverImage: string;
  mode: "create" | "update";
  issues: string[];
};

type CommitRowInput = {
  tempId: string;
  name?: string | null;
  slug?: string | null;
  description?: string | null;
  coverImage?: string | null;
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

  return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
}

async function handlePreview(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "Missing file" }, { status: 400 });
    }

    const text = await file.text();
    const csvRows = parseCsv(text);
    if (!csvRows.length) {
      return NextResponse.json({ rows: [] }, { status: 200 });
    }

    const normalized = csvRows.map((row) => {
      const rawName = (row.name ?? "").trim();
      const rawSlug = (row.slug ?? "").trim();
      const slug = rawSlug || (rawName ? slugify(rawName) : "");
      return {
        ...row,
        name: rawName,
        slug,
        description: (row.description ?? "").trim(),
        coverImage: (row.coverImage ?? "").trim(),
      };
    });

    const slugList = Array.from(
      new Set(
        normalized
          .map((r) => r.slug)
          .filter((s): s is string => !!s),
      ),
    );

    const existingCategories = slugList.length
      ? await prisma.productcategory.findMany({
          where: { slug: { in: slugList } },
        })
      : [];

    const existingMap = new Map(existingCategories.map((c) => [c.slug, c]));

    const previewRows: PreviewRow[] = normalized.map((row, index) => {
      const existing = row.slug ? existingMap.get(row.slug) : undefined;
      const mode: "create" | "update" = existing ? "update" : "create";

      const mergedName = row.name || existing?.name || "";
      const mergedSlug = row.slug || existing?.slug || "";
      const mergedDescription = row.description || existing?.description || "";
      const mergedCover = row.coverImage || existing?.coverImage || "";

      const issues: string[] = [];
      if (!mergedName) issues.push("Thiếu name");
      if (!mergedSlug) issues.push("Thiếu slug");

      return {
        tempId: `row_${index}_${Date.now()}`,
        name: mergedName,
        slug: mergedSlug,
        description: mergedDescription,
        coverImage: mergedCover,
        mode,
        issues,
      };
    });

    return NextResponse.json({ rows: previewRows }, { status: 200 });
  } catch (error) {
    console.error("category bulk preview error", error);
    return NextResponse.json({ error: "Preview failed" }, { status: 500 });
  }
}

async function handleCommit(req: NextRequest) {
  try {
    const body = (await req.json()) as { rows: CommitRowInput[] };
    const rows = body.rows ?? [];
    if (!rows.length) {
      return NextResponse.json({ results: [] }, { status: 200 });
    }

    const normalized = rows.map((row) => {
      const name = (row.name ?? "").trim();
      const slugRaw = (row.slug ?? "").trim();
      const slug = slugRaw || (name ? slugify(name) : "");
      return {
        ...row,
        name: name || undefined,
        slug: slug || undefined,
        description:
          row.description !== null && row.description !== undefined
            ? row.description
            : undefined,
        coverImage:
          row.coverImage !== null && row.coverImage !== undefined
            ? row.coverImage
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

    const existingCategories = slugList.length
      ? await prisma.productcategory.findMany({
          where: { slug: { in: slugList } },
        })
      : [];

    const existingMap = new Map(existingCategories.map((c) => [c.slug, c]));
    const results: { tempId: string; categoryId: string }[] = [];

    for (const row of normalized) {
      const { tempId } = row;
      const name = row.name?.trim();
      const slug = row.slug?.trim();

      if (!tempId || (!name && !slug)) continue;

      const keySlug = slug || (name ? slugify(name) : undefined);
      if (!keySlug) continue;

      const existing = existingMap.get(keySlug);
      const now = new Date();

      if (!existing) {
        if (!name) continue;

        const created = await prisma.productcategory.create({
          data: {
            id: randomUUID(),
            name,
            slug: keySlug,
            description:
              row.description && row.description.trim().length
                ? row.description.trim()
                : null,
            coverImage:
              row.coverImage && row.coverImage.trim().length
                ? row.coverImage.trim()
                : null,
            createdAt: now,
            updatedAt: now,
          },
        });
        results.push({ tempId, categoryId: created.id });
      } else {
        const data: Record<string, unknown> = { updatedAt: now };

        if (name && name.length) {
          data.name = name;
        }

        if (slug && slug.length && slug !== existing.slug) {
          const dup = await prisma.productcategory.findUnique({
            where: { slug },
          });
          if (!dup) {
            data.slug = slug;
          }
        }

        if (
          row.description !== undefined &&
          row.description !== null &&
          row.description.trim().length > 0
        ) {
          data.description = row.description.trim();
        }

        if (
          row.coverImage !== undefined &&
          row.coverImage !== null &&
          row.coverImage.trim().length > 0
        ) {
          data.coverImage = row.coverImage.trim();
        }

        const updated = await prisma.productcategory.update({
          where: { id: existing.id },
          data,
        });
        results.push({ tempId, categoryId: updated.id });
      }
    }

    return NextResponse.json({ results }, { status: 200 });
  } catch (error) {
    console.error("category bulk commit error", error);
    return NextResponse.json({ error: "Commit failed" }, { status: 500 });
  }
}

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
  const idxDescription = header.indexOf("description");
  const idxCover = header.indexOf("coverimage");

  const rows: CsvRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const raw = lines[i];
    if (!raw.trim()) continue;

    const cols = splitCsvLine(raw);
    const row: CsvRow = {};

    if (idxName >= 0 && idxName < cols.length) row.name = cols[idxName];
    if (idxSlug >= 0 && idxSlug < cols.length) row.slug = cols[idxSlug];
    if (idxDescription >= 0 && idxDescription < cols.length) row.description = cols[idxDescription];
    if (idxCover >= 0 && idxCover < cols.length) row.coverImage = cols[idxCover];

    if (!row.name && !row.slug && !row.description && !row.coverImage) {
      continue;
    }

    rows.push(row);
  }

  return rows;
}

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

  return result.map((s) => s.trim().replace(/^"|"$/g, ""));
}
