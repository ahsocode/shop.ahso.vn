import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { verifyBearerAuth, requireRole } from "@/lib/auth";
import { slugify } from "@/lib/slug";
import { randomUUID } from "crypto";

export const runtime = "nodejs";

type ProductDraft = {
  tempId: string;
  sku: string;
  slug?: string;
  name: string;
  descriptionShort: string;
  description: string;
  primaryCategory: string | null;
  typeSlug: string | null;
  brandSlug: string | null;
  stockOnHand: number | null;
  costPrice: number | null;
  price: number | null;
  listPrice: number | null;
  coverImage: string | null;
  galleryImages: string[];
  specs: SpecDraft[];
  status?: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  currency?: string;
  issues: string[];
  mode: "create" | "update";
  existingProductId?: string;
  missing: MissingRefs;
};

type SpecDraft = {
  key: string;
  value: string;
  unit?: string;
};

type MissingRefs = {
  brand?: string;
  type?: string;
  categories?: string[];
};

type CommitRowInput = ProductDraft;

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

    const rows = await parseFileToRows(file);
    if (!rows.length) {
      return NextResponse.json({ rows: [] }, { status: 200 });
    }

    const drafts = await buildProductDrafts(rows);
    return NextResponse.json({ rows: drafts }, { status: 200 });
  } catch (error) {
    console.error("product bulk preview error", error);
    const message = error instanceof Error ? error.message : "Preview failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function handleCommit(req: NextRequest) {
  try {
    const body = (await req.json()) as { rows: CommitRowInput[] };
    const rows = body.rows ?? [];
    if (!rows.length) {
      return NextResponse.json({ results: [] }, { status: 200 });
    }

    const refs = await loadReferenceMaps(rows);
    const specCtx = await prepareSpecDefinitions(rows);

    const results: Array<{
      tempId: string;
      sku: string;
      status: "success" | "error";
      message?: string;
      productId?: string;
    }> = [];

    for (const row of rows) {
      const result = await upsertProductRow(row, refs, specCtx);
      results.push(result);
    }

    return NextResponse.json({ results }, { status: 200 });
  } catch (error) {
    console.error("product bulk commit error", error);
    const message = error instanceof Error ? error.message : "Commit failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function parseFileToRows(file: File) {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(buffer, { type: "buffer" });
  } catch (err) {
    const text = buffer.toString("utf8");
    workbook = XLSX.read(text, { type: "string" });
  }

  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
    raw: false,
  });
  return json;
}

async function buildProductDrafts(rows: Record<string, unknown>[]): Promise<ProductDraft[]> {
  const normalizedRows = rows.map((row, idx) => normalizeColumns(row, idx));
  const skuList = normalizedRows
    .map((r) => r.sku)
    .filter((sku): sku is string => Boolean(sku));

  const brandSlugs = new Set(
    normalizedRows.map((r) => r.brandSlug).filter((slug): slug is string => Boolean(slug)),
  );
  const typeSlugs = new Set(
    normalizedRows.map((r) => r.typeSlug).filter((slug): slug is string => Boolean(slug)),
  );
  const categorySlugs = new Set(
    normalizedRows.map((r) => r.primaryCategory).filter((slug): slug is string => Boolean(slug)),
  );

  const [products, brands, types, categories] = await Promise.all([
    skuList.length
      ? prisma.product.findMany({
          where: { sku: { in: skuList } },
          select: { id: true, sku: true },
        })
      : Promise.resolve([]),
    brandSlugs.size
      ? prisma.brand.findMany({
          where: { slug: { in: Array.from(brandSlugs) } },
          select: { id: true, slug: true, name: true },
        })
      : Promise.resolve([]),
    typeSlugs.size
      ? prisma.producttype.findMany({
          where: { slug: { in: Array.from(typeSlugs) } },
          select: { id: true, slug: true, name: true },
        })
      : Promise.resolve([]),
    categorySlugs.size
      ? prisma.productcategory.findMany({
          where: { slug: { in: Array.from(categorySlugs) } },
          select: { id: true, slug: true, name: true },
        })
      : Promise.resolve([]),
  ]);

  const productMap = new Map(products.map((p) => [p.sku, p]));
  const brandMap = new Map(brands.map((b) => [b.slug, b]));
  const typeMap = new Map(types.map((t) => [t.slug, t]));
  const categoryMap = new Map(categories.map((c) => [c.slug, c]));

  const seenSku = new Map<string, number>();

  return normalizedRows.map((row, index) => {
    const issues: string[] = [];
    const missing: MissingRefs = {};

    if (!row.sku) {
      issues.push("Thiếu SKU");
    } else {
      const count = seenSku.get(row.sku) ?? 0;
      seenSku.set(row.sku, count + 1);
      if (count > 0) {
        issues.push("SKU bị trùng trong file");
      }
    }

    if (!row.name) {
      issues.push("Thiếu tên sản phẩm");
    }
    if (!row.typeSlug) {
      issues.push("Thiếu loại sản phẩm");
    }

    if (row.brandSlug && !brandMap.has(row.brandSlug)) {
      missing.brand = row.brandSlug;
    }
    if (row.typeSlug && !typeMap.has(row.typeSlug)) {
      missing.type = row.typeSlug;
    }
    const missingCategories = [row.primaryCategory || undefined]
      .filter((slug): slug is string => Boolean(slug))
      .filter((slug) => !categoryMap.has(slug));
    if (missingCategories.length) {
      missing.categories = Array.from(new Set(missingCategories));
    }

    const existing = row.sku ? productMap.get(row.sku) : null;
    const mode: "create" | "update" = existing ? "update" : "create";

    return {
      tempId: randomUUID(),
      sku: row.sku ?? "",
      slug: row.slug ?? slugify(row.name || row.sku || `san-pham-${index + 1}`),
      name: row.name ?? "",
      descriptionShort: row.descriptionShort ?? "",
      description: row.description ?? "",
      primaryCategory: row.primaryCategory,
      typeSlug: row.typeSlug,
      brandSlug: row.brandSlug,
      stockOnHand: row.stockOnHand,
      costPrice: row.costPrice,
      price: row.price,
      listPrice: row.listPrice,
      coverImage: row.coverImage,
      galleryImages: row.galleryImages,
      specs: row.specs,
      status: row.status,
      currency: row.currency,
      issues,
      mode,
      existingProductId: existing?.id,
      missing,
    };
  });
}

type NormalizedRow = {
  sku: string | null;
  slug: string | null;
  name: string | null;
  descriptionShort: string;
  description: string;
  primaryCategory: string | null;
  typeSlug: string | null;
  brandSlug: string | null;
  stockOnHand: number | null;
  costPrice: number | null;
  price: number | null;
  listPrice: number | null;
  coverImage: string | null;
  galleryImages: string[];
  specs: SpecDraft[];
  status?: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  currency?: string;
};

const COLUMN_ALIASES: Record<string, string[]> = {
  sku: ["sku", "ma san pham", "mã sản phẩm", "ma_sp"],
  slug: ["slug"],
  name: ["ten san pham", "tên sản phẩm", "name", "product name"],
  primaryCategory: ["danh muc san pham", "danh mục sản phẩm", "category", "danhmuc"],
  typeSlug: ["phan loai", "phân loại", "loai san pham", "product type", "type slug"],
  brandSlug: ["thuong hieu", "thương hiệu", "brand", "brand slug"],
  descriptionShort: ["mo ta ngan", "mô tả ngắn", "summary"],
  description: ["mo ta", "mô tả", "description", "chi tiet"],
  stockOnHand: ["ton kho", "tồn kho", "stock"],
  costPrice: ["gia nhap", "giá nhập", "cost price"],
  price: ["gia ban", "giá bán", "price"],
  listPrice: ["gia niem yet", "giá niêm yết", "list price"],
  coverImage: ["hinh anh", "ảnh đại diện", "cover image"],
  galleryImages: ["hinh anh khac", "ảnh khác", "gallery"],
  specs: [
    "thong so ky thuat",
    "thông số kỹ thuật",
    "thông số kỹ thuật (mỗi dòng: tên: giá trị)",
    "thong so ky thuat (moi dong: ten: gia tri)",
    "thông số kỹ thuật (mỗi dòng hoặc dùng | : tên: giá trị)",
    "thong so ky thuat (moi dong hoac dung | : ten: gia tri)",
  ],
  status: ["status", "trang thai"],
  currency: ["currency", "tien te"],
};

function normalizeColumns(row: Record<string, unknown>, idx: number): NormalizedRow {
  const lowerCaseEntries = Object.entries(row).reduce<Record<string, string>>((acc, [key, value]) => {
    acc[key.trim().toLowerCase()] = String(value ?? "").trim();
    return acc;
  }, {});

  const getValue = (key: keyof typeof COLUMN_ALIASES): string => {
    const aliases = COLUMN_ALIASES[key] ?? [];
    for (const alias of aliases) {
      const normalized = alias.toLowerCase();
      if (normalized in lowerCaseEntries) {
        return lowerCaseEntries[normalized];
      }
    }
    return "";
  };

  const sku = getValue("sku") || null;
  const slug = slugifyText(getValue("slug"));
  const name = getValue("name") || null;
  const descriptionShort = getValue("descriptionShort");
  const description = getValue("description");
  const primaryCategory = slugifyText(getValue("primaryCategory"));
  const typeSlug = slugifyText(getValue("typeSlug"));
  const brandSlug = slugifyText(getValue("brandSlug"));
  const stockOnHand = parseNumber(getValue("stockOnHand"));
  const costPrice = parseNumber(getValue("costPrice"));
  const price = parseNumber(getValue("price"));
  const listPrice = parseNumber(getValue("listPrice"));
  const coverImage = getValue("coverImage") || null;
  const galleryRaw = getValue("galleryImages");
  const galleryImages = galleryRaw
    ? galleryRaw
        .split(/[|;]/)
        .map((item) => item.trim())
        .filter(Boolean)
    : [];
  const specs = parseSpecs(lowerCaseEntries);

  const statusRaw = getValue("status");
  const status = (statusRaw?.toUpperCase() as "DRAFT" | "PUBLISHED" | "ARCHIVED") || undefined;
  const currency = getValue("currency") || undefined;

  return {
    sku,
    slug,
    name,
    descriptionShort,
    description,
    primaryCategory,
    typeSlug,
    brandSlug,
    stockOnHand,
    costPrice,
    price,
    listPrice,
    coverImage,
    galleryImages,
    specs,
    status,
    currency,
  };
}

function slugifyText(value: string) {
  if (!value) return null;
  const text = value.trim();
  if (!text) return null;
  return slugify(text);
}

function parseNumber(value: string) {
  if (!value) return null;
  const normalized = Number(value.replace(/,/g, ""));
  return Number.isNaN(normalized) ? null : normalized;
}

function parseSpecs(row: Record<string, string>): SpecDraft[] {
  const specKeys = COLUMN_ALIASES.specs.map((alias) => alias.toLowerCase());
  let fieldValue = "";
  for (const key of specKeys) {
    if (key in row) {
      fieldValue = row[key];
      break;
    }
  }
  if (!fieldValue) return [];

  const lines = fieldValue
    .split(/(?:\r?\n|\|)/)
    .map((line) => line.trim())
    .filter(Boolean);

  const specs: SpecDraft[] = [];
  for (const line of lines) {
    const separatorIndex = line.indexOf(":");
    if (separatorIndex === -1) continue;
    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();
    if (!key || !value) continue;
    specs.push({ key, value });
  }
  return specs;
}

type ReferenceMaps = {
  products: Map<string, { id: string; slug: string }>;
  brands: Map<string, { id: string; slug: string }>;
  types: Map<string, { id: string; slug: string; name: string }>;
  categories: Map<string, { id: string; slug: string; name: string }>;
};

async function loadReferenceMaps(rows: CommitRowInput[]): Promise<ReferenceMaps> {
  const skuSet = new Set(rows.map((r) => r.sku).filter(Boolean) as string[]);
  const brandSet = new Set(
    rows.map((r) => r.brandSlug).filter((slug): slug is string => Boolean(slug)),
  );
  const typeSet = new Set(
    rows.map((r) => r.typeSlug).filter((slug): slug is string => Boolean(slug)),
  );
  const categorySet = new Set(
    rows.map((r) => r.primaryCategory).filter((slug): slug is string => Boolean(slug)),
  );

  const [products, brands, types, categories] = await Promise.all([
    skuSet.size
      ? prisma.product.findMany({
          where: { sku: { in: Array.from(skuSet) } },
          select: { id: true, sku: true, slug: true },
        })
      : Promise.resolve([]),
    brandSet.size
      ? prisma.brand.findMany({
          where: { slug: { in: Array.from(brandSet) } },
          select: { id: true, slug: true, name: true },
        })
      : Promise.resolve([]),
    typeSet.size
      ? prisma.producttype.findMany({
          where: { slug: { in: Array.from(typeSet) } },
          select: { id: true, slug: true, name: true },
        })
      : Promise.resolve([]),
    categorySet.size
      ? prisma.productcategory.findMany({
          where: { slug: { in: Array.from(categorySet) } },
          select: { id: true, slug: true, name: true },
        })
      : Promise.resolve([]),
  ]);

  return {
    products: new Map(products.map((p) => [p.sku, p])),
    brands: new Map(brands.map((b) => [b.slug, b])),
    types: new Map(types.map((t) => [t.slug, t])),
    categories: new Map(categories.map((c) => [c.slug, c])),
  };
}


type SpecContext = {
  ensureDefinition(name: string): Promise<{ id: string; name: string } | null>;
};

async function prepareSpecDefinitions(rows: CommitRowInput[]): Promise<SpecContext> {
  const specNames = new Set(
    rows
      .flatMap((r) => r.specs || [])
      .map((spec) => spec.key?.trim())
      .filter((name): name is string => Boolean(name)),
  );

  const slugNamePairs = Array.from(specNames).map((name) => ({
    name,
    slug: slugify(name) || slugify(`spec-${name}`),
  }));

  const validSlugs = slugNamePairs.map((pair) => pair.slug).filter(Boolean) as string[];

  const existingDefs = validSlugs.length
    ? await prisma.productspecdefinition.findMany({
        where: { slug: { in: validSlugs } },
        select: { id: true, slug: true, name: true },
      })
    : [];

  const map = new Map(existingDefs.map((def) => [def.slug, def]));

  return {
    async ensureDefinition(name: string) {
      const trimmed = name.trim();
      if (!trimmed) return null;
      const slug = slugify(trimmed) || slugify(`spec-${trimmed}`);
      if (!slug) return null;
      const existing = map.get(slug);
      if (existing) return existing;
      const timestamp = new Date();
      const created = await prisma.productspecdefinition.create({
        data: {
          id: randomUUID(),
          name: trimmed,
          slug,
          createdAt: timestamp,
          updatedAt: timestamp,
        },
      });
      map.set(slug, created);
      return created;
    },
  };
}

async function upsertProductRow(
  row: CommitRowInput,
  refs: ReferenceMaps,
  specCtx: SpecContext,
) {
  const errors: string[] = [];
  if (!row.sku) {
    errors.push("Thiếu SKU");
  }
  if (!row.name) {
    errors.push("Thiếu tên sản phẩm");
  }
  const type = row.typeSlug ? refs.types.get(row.typeSlug) : null;
  if (!type) {
    errors.push("Loại sản phẩm không tồn tại");
  }

  const brand = row.brandSlug ? refs.brands.get(row.brandSlug) : null;
  if (row.brandSlug && !brand) {
    errors.push(`Không tìm thấy thương hiệu: ${row.brandSlug}`);
  }


  const categoryIds: string[] = [];
  if (row.primaryCategory) {
    const cat = refs.categories.get(row.primaryCategory);
    if (cat) {
      categoryIds.push(cat.id);
    } else {
      errors.push(`Không tìm thấy danh mục: ${row.primaryCategory}`);
    }
  }

  if (errors.length) {
    return {
      tempId: row.tempId,
      sku: row.sku ?? "",
      status: "error" as const,
      message: errors.join("; "),
    };
  }

  const existing = row.sku ? refs.products.get(row.sku) : null;
  const slug = await ensureProductSlug(row.slug ?? row.name ?? row.sku ?? "", existing?.id);

  const priceDirect = numberOrUndefined(row.price);
  const priceValue =
    priceDirect ??
    numberOrUndefined(row.listPrice) ??
    numberOrUndefined(row.costPrice) ??
    0;
  const costValue = numberOrUndefined(row.costPrice);

  const descriptionValue =
    stringOrNull(row.description) ?? stringOrNull(row.descriptionShort) ?? null;

  const createData: Prisma.productUncheckedCreateInput = {
    id: randomUUID(),
    sku: row.sku!,
    name: row.name!,
    slug,
    description: descriptionValue,
    costPrice: costValue ?? null,
    price: priceValue ?? 0,
    listPrice: numberOrUndefined(row.listPrice) ?? null,
    stockOnHand: numberOrUndefined(row.stockOnHand) ?? undefined,
    typeId: type!.id,
    brandId: brand?.id ?? null,
    coverImage: stringOrNull(row.coverImage),
    currency: row.currency || undefined,
    status: row.status ?? undefined,
  };

  const updateData: Prisma.productUncheckedUpdateInput = {
    name: row.name ?? undefined,
    slug,
    description: descriptionValue ?? undefined,
    costPrice: costValue ?? undefined,
    price: priceDirect ?? undefined,
    listPrice: numberOrUndefined(row.listPrice) ?? undefined,
    stockOnHand: numberOrUndefined(row.stockOnHand) ?? undefined,
    typeId: type!.id,
    brandId: brand?.id ?? undefined,
    coverImage: stringOrNull(row.coverImage) ?? undefined,
    currency: row.currency || undefined,
    status: row.status ?? undefined,
  };

  const product = await prisma.product.upsert({
    where: { sku: row.sku! },
    create: createData,
    update: updateData,
  });

  refs.products.set(row.sku!, { id: product.id, slug: product.slug });

  await updateProductCategories(product.id, categoryIds);
  await updateProductSpecs(product.id, row.specs || [], specCtx);

  return {
    tempId: row.tempId,
    sku: row.sku ?? "",
    status: "success" as const,
    productId: product.id,
  };
}

async function updateProductCategories(productId: string, categoryIds: string[]) {
  await prisma.productcategorylink.deleteMany({ where: { productId } });
  if (!categoryIds.length) return;
  const uniqueIds = Array.from(new Set(categoryIds));
  await prisma.productcategorylink.createMany({
    data: uniqueIds.map((categoryId) => ({ productId, categoryId })),
    skipDuplicates: true,
  });
}

async function updateProductSpecs(
  productId: string,
  specs: SpecDraft[],
  specCtx: SpecContext,
) {
  await prisma.productspecvalue.deleteMany({ where: { productId } });
  if (!specs.length) return;

  const rows: Prisma.productspecvalueCreateManyInput[] = [];
  for (const [index, spec] of specs.entries()) {
    if (!spec.key || !spec.value) continue;
    const definition = await specCtx.ensureDefinition(spec.key);
    if (!definition) continue;
    const timestamp = new Date();
    rows.push({
      id: randomUUID(),
      productId,
      specDefinitionId: definition.id,
      valueString: spec.value,
      unitOverride: spec.unit || undefined,
      sortOrder: index,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  }

  if (rows.length) {
    await prisma.productspecvalue.createMany({
      data: rows,
    });
  }
}

async function ensureProductSlug(base: string, existingId?: string) {
  const normalized = slugify(base) || slugify(`san-pham-${randomUUID()}`);
  let slug = normalized || `san-pham-${randomUUID()}`;
  let counter = 1;
  while (true) {
    const found = await prisma.product.findUnique({ where: { slug } });
    if (!found || found.id === existingId) {
      return slug;
    }
    slug = `${normalized}-${counter++}`;
  }
}

function stringOrNull(value?: string | null) {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function numberOrUndefined(value?: number | string | null) {
  if (value === null || value === undefined || value === "") return undefined;
  const numeric = typeof value === "string" ? Number(value.replace(/,/g, "")) : value;
  if (Number.isNaN(numeric)) return undefined;
  return numeric;
}
