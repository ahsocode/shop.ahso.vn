import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { verifyBearerAuth, requireRole } from "@/lib/auth";
import { slugify } from "@/lib/slug";

export const runtime = "nodejs";

type CsvRow = {
  name?: string;
  slug?: string;
  categorySlug?: string;
  description?: string;
  coverImage?: string;
};

type PreviewRow = {
  tempId: string;
  name: string;
  slug: string;
  categorySlug: string;
  description: string;
  coverImage: string;
  mode: "create" | "update";
  issues: string[];
};

type CommitRowInput = {
  tempId: string;
  name?: string | null;
  slug?: string | null;
  categorySlug?: string | null;
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
      const categorySlug = slugify((row.categorySlug ?? "").trim());
      return {
        ...row,
        name: rawName,
        slug,
        categorySlug,
        description: (row.description ?? "").trim(),
        coverImage: (row.coverImage ?? "").trim(),
      };
    });

    const categorySlugList = Array.from(
      new Set(normalized.map((r) => r.categorySlug).filter((s): s is string => !!s)),
    );
    const categoryRows = categorySlugList.length
      ? await prisma.productcategory.findMany({
          where: { slug: { in: categorySlugList } },
          select: { id: true, name: true, slug: true },
        })
      : [];
    const categoryMap = new Map(categoryRows.map((c) => [c.slug, c]));
    const categoryIds = new Set(categoryRows.map((c) => c.id));

    const slugList = Array.from(new Set(normalized.map((r) => r.slug).filter((s): s is string => !!s)));
    const existingTypes =
      slugList.length && categoryIds.size
        ? await prisma.producttype.findMany({
            where: { slug: { in: slugList }, categoryId: { in: Array.from(categoryIds) } },
            select: { id: true, name: true, slug: true, description: true, coverImage: true, categoryId: true },
          })
        : [];

    const existingMap = new Map(
      existingTypes.map((t) => [`${t.categoryId}::${t.slug}`, t]),
    );

    const previewRows: PreviewRow[] = normalized.map((row, index) => {
      const category = row.categorySlug ? categoryMap.get(row.categorySlug) : undefined;
      const key = category && row.slug ? `${category.id}::${row.slug}` : null;
      const existing = key ? existingMap.get(key) : undefined;

      const mergedName = row.name || existing?.name || "";
      const mergedSlug = row.slug || existing?.slug || "";
      const mergedDescription = row.description || existing?.description || "";
      const mergedCover = row.coverImage || existing?.coverImage || "";
      const mergedCategorySlug = row.categorySlug || (category?.slug ?? "");

      const issues: string[] = [];
      if (!mergedName) issues.push("Thiếu name");
      if (!mergedSlug) issues.push("Thiếu slug");
      if (!mergedCategorySlug) {
        issues.push("Thiếu categorySlug");
      } else if (!category) {
        issues.push(`Không tìm thấy danh mục (${mergedCategorySlug})`);
      }

      return {
        tempId: `row_${index}_${Date.now()}`,
        name: mergedName,
        slug: mergedSlug,
        categorySlug: mergedCategorySlug,
        description: mergedDescription,
        coverImage: mergedCover,
        mode: existing ? "update" : "create",
        issues,
      };
    });

    return NextResponse.json({ rows: previewRows }, { status: 200 });
  } catch (error) {
    console.error("product-type bulk preview error", error);
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
      const categorySlug = slugify((row.categorySlug ?? "").trim());
      return {
        ...row,
        name: name || undefined,
        slug: slug || undefined,
        categorySlug: categorySlug || undefined,
        description:
          row.description !== null && row.description !== undefined ? row.description : undefined,
        coverImage:
          row.coverImage !== null && row.coverImage !== undefined ? row.coverImage : undefined,
      };
    });

    const categorySlugList = Array.from(
      new Set(
        normalized
          .map((r) => r.categorySlug)
          .filter((s): s is string => !!s),
      ),
    );
    const categoryRows = categorySlugList.length
      ? await prisma.productcategory.findMany({
          where: { slug: { in: categorySlugList } },
          select: { id: true, slug: true },
        })
      : [];
    const categoryMap = new Map(categoryRows.map((c) => [c.slug, c]));
    const categoryIds = new Set(categoryRows.map((c) => c.id));

    const slugList = Array.from(
      new Set(
        normalized
          .map((r) => r.slug)
          .filter((s): s is string => !!s),
      ),
    );

    const existingTypes =
      slugList.length && categoryIds.size
        ? await prisma.producttype.findMany({
            where: { slug: { in: slugList }, categoryId: { in: Array.from(categoryIds) } },
            select: { id: true, slug: true, categoryId: true },
          })
        : [];

    const existingMap = new Map(
      existingTypes.map((t) => [`${t.categoryId}::${t.slug}`, t]),
    );

    const results: { tempId: string; typeId: string }[] = [];

    for (const row of normalized) {
      const { tempId } = row;
      const name = row.name?.trim();
      const slug = row.slug?.trim();
      const categorySlug = row.categorySlug?.trim();
      if (!tempId) continue;
      if (!categorySlug) continue;
      const category = categoryMap.get(categorySlug);
      if (!category) continue;
      if (!slug && !name) continue;
      const keySlug = slug || (name ? slugify(name) : undefined);
      if (!keySlug) continue;

      const key = `${category.id}::${keySlug}`;
      const existing = existingMap.get(key);
      const now = new Date();

      if (!existing) {
        if (!name) continue;
        const created = await prisma.producttype.create({
          data: {
            id: randomUUID(),
            name,
            slug: keySlug,
            categoryId: category.id,
            description:
              row.description && row.description.trim().length ? row.description.trim() : null,
            coverImage:
              row.coverImage && row.coverImage.trim().length ? row.coverImage.trim() : null,
            createdAt: now,
            updatedAt: now,
          },
        });
        results.push({ tempId, typeId: created.id });
      } else {
        const data: Record<string, unknown> = { updatedAt: now };
        if (name && name.length) {
          data.name = name;
        }
        if (category.id !== existing.categoryId) {
          data.categoryId = category.id;
        }
        if (slug && slug.length && slug !== existing.slug) {
          const dup = await prisma.producttype.findUnique({
            where: { categoryId_slug: { categoryId: category.id, slug } },
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

        await prisma.producttype.update({
          where: { id: existing.id },
          data,
        });
        results.push({ tempId, typeId: existing.id });
      }
    }

    return NextResponse.json({ results }, { status: 200 });
  } catch (error) {
    console.error("product-type bulk commit error", error);
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
  const idxCategorySlug = header.indexOf("categoryslug");
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
    if (idxCategorySlug >= 0 && idxCategorySlug < cols.length) row.categorySlug = cols[idxCategorySlug];
    if (idxDescription >= 0 && idxDescription < cols.length) row.description = cols[idxDescription];
    if (idxCover >= 0 && idxCover < cols.length) row.coverImage = cols[idxCover];

    if (!row.name && !row.slug && !row.categorySlug && !row.description && !row.coverImage) {
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
