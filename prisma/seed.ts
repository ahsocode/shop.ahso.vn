
import { randomUUID } from "crypto";
import { PrismaClient } from "@prisma/client";
import fs from "fs";

const prisma = new PrismaClient();
const data = JSON.parse(fs.readFileSync("./prisma/catalog-seed.json", "utf8"));

const now = () => new Date();

async function main() {
  // 1) Brands
  for (const b of data.brands) {
    await prisma.brand.upsert({
      where: { slug: b.slug },
      update: {
        name: b.name,
        logoUrl: b.logoUrl ?? null,
        summary: b.summary ?? null,
        updatedAt: now(),
      },
      create: {
        id: randomUUID(),
        slug: b.slug,
        name: b.name,
        logoUrl: b.logoUrl ?? null,
        summary: b.summary ?? null,
        updatedAt: now(),
      },
    });
  }

  // 2) Categories
  for (const c of data.productCategories) {
    await prisma.productcategory.upsert({
      where: { slug: c.slug },
      update: {
        name: c.name,
        coverImage: c.coverImage ?? null,
        description: c.description ?? null,
        updatedAt: now(),
      },
      create: {
        id: randomUUID(),
        slug: c.slug,
        name: c.name,
        coverImage: c.coverImage ?? null,
        description: c.description ?? null,
        updatedAt: now(),
      },
    });
  }

  // 3) Product Types
  for (const t of data.productTypes) {
    const cat = await prisma.productcategory.findUnique({ where: { slug: t.categorySlug } });
    if (!cat) throw new Error(`Category not found for type: ${t.slug}`);
    await prisma.producttype.upsert({
      where: { categoryId_slug: { categoryId: cat.id, slug: t.slug } },
      update: {
        name: t.name,
        coverImage: t.coverImage ?? null,
        description: t.description ?? null,
        updatedAt: now(),
      },
      create: {
        id: randomUUID(),
        slug: t.slug,
        name: t.name,
        coverImage: t.coverImage ?? null,
        description: t.description ?? null,
        categoryId: cat.id,
        updatedAt: now(),
      },
    });
  }

  // 4) Units
  for (const u of data.units) {
    await prisma.unitdefinition.upsert({
      where: { name: u.name },
      update: {
        symbol: u.symbol ?? null,
        dimension: u.dimension ?? null,
        baseName: u.baseName ?? null,
        factorToBase: u.factorToBase ?? null,
        updatedAt: now(),
      },
      create: {
        id: randomUUID(),
        name: u.name,
        symbol: u.symbol ?? null,
        dimension: u.dimension ?? null,
        baseName: u.baseName ?? null,
        factorToBase: u.factorToBase ?? null,
        updatedAt: now(),
      },
    });
  }

  // 5) Spec Definitions
  for (const s of data.specDefinitions) {
    await prisma.productspecdefinition.upsert({
      where: { slug: s.slug },
      update: { name: s.name, updatedAt: now() },
      create: { id: randomUUID(), slug: s.slug, name: s.name, updatedAt: now() },
    });
  }

  // 6) Products
  for (const p of data.products) {
    const brand = p.brandSlug ? await prisma.brand.findUnique({ where: { slug: p.brandSlug } }) : null;
    const type = await prisma.producttype.findFirst({ where: { slug: p.typeSlug } });
    if (!type) throw new Error(`ProductType not found: ${p.typeSlug}`);

    const unit = p.unitName ? await prisma.unitdefinition.findUnique({ where: { name: p.unitName } }) : null;

    // Create Product with nested specs & images
    const created = await prisma.product.create({
      data: {
        id: randomUUID(),
        slug: p.slug,
        name: p.name,
        sku: p.sku,
        description: p.description ?? null,
        coverImage: p.coverImage ?? null,
        price: p.price,
        listPrice: p.listPrice ?? null,
        currency: p.currency ?? "VND",
        stockOnHand: p.stockOnHand ?? 0,
        stockReserved: p.stockReserved ?? 0,
        taxIncluded: p.taxIncluded ?? true,
        status: p.status ?? "PUBLISHED",
        typeId: type.id,
        brandId: brand?.id ?? null,
        unitId: unit?.id ?? null,
        quantityValue: p.quantityValue ?? null,
        quantityLabel: p.quantityLabel ?? null,
        updatedAt: now(),
        productimage: p.images?.length
          ? {
              create: p.images.map((i: (typeof p.images)[number], idx: number) => ({
                id: randomUUID(),
                url: i.url,
                alt: i.alt ?? null,
                sortOrder: idx + 1,
                updatedAt: now(),
              })),
            }
          : undefined,
        productspecvalue: p.specs?.length
          ? {
              create: p.specs.map((s: (typeof p.specs)[number], idx: number) => ({
                id: randomUUID(),
                productspecdefinition: { connect: { slug: s.specSlug } },
                valueString: s.valueString ?? null,
                valueNumber: s.valueNumber ?? null,
                valueBoolean: s.valueBoolean ?? null,
                unitOverride: s.unitOverride ?? null,
                sortOrder: idx,
                updatedAt: now(),
              })),
            }
          : undefined,
      },
    });

    // Many-to-many Category links
    for (const slug of p.categorySlugs ?? []) {
      const cat = await prisma.productcategory.findUnique({ where: { slug } });
      if (cat) {
        await prisma.productcategorylink.create({
          data: { productId: created.id, categoryId: cat.id },
        });
      }
    }
  }

  console.log("✅ Seed catalog hoàn tất");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
