
import { PrismaClient } from "@prisma/client";
import fs from "fs";

const prisma = new PrismaClient();
const data = JSON.parse(fs.readFileSync("./prisma/catalog-seed.json", "utf8"));

async function main() {
  // 1) Brands
  for (const b of data.brands) {
    await prisma.brand.upsert({
      where: { slug: b.slug },
      update: { name: b.name, logoUrl: b.logoUrl ?? null, summary: b.summary ?? null },
      create: { slug: b.slug, name: b.name, logoUrl: b.logoUrl ?? null, summary: b.summary ?? null }
    });
  }

  // 2) Categories
  for (const c of data.productCategories) {
    await prisma.productCategory.upsert({
      where: { slug: c.slug },
      update: { name: c.name, coverImage: c.coverImage ?? null, description: c.description ?? null },
      create: { slug: c.slug, name: c.name, coverImage: c.coverImage ?? null, description: c.description ?? null }
    });
  }

  // 3) Product Types
  for (const t of data.productTypes) {
    const cat = await prisma.productCategory.findUnique({ where: { slug: t.categorySlug } });
    if (!cat) throw new Error(`Category not found for type: ${t.slug}`);
    // Composite unique is (categoryId, slug); we upsert by a shadow unique on slug+categoryId
    const where = { categoryId_slug: { categoryId: cat.id, slug: t.slug } } as any;
    await prisma.productType.upsert({
      where,
      update: { name: t.name, coverImage: t.coverImage ?? null, description: t.description ?? null },
      create: { slug: t.slug, name: t.name, coverImage: t.coverImage ?? null, description: t.description ?? null, categoryId: cat.id }
    });
  }

  // 4) Units
  for (const u of data.units) {
    await prisma.unitDefinition.upsert({
      where: { name: u.name },
      update: { symbol: u.symbol ?? null, dimension: u.dimension ?? null, baseName: u.baseName ?? null, factorToBase: u.factorToBase ?? null },
      create: { name: u.name, symbol: u.symbol ?? null, dimension: u.dimension ?? null, baseName: u.baseName ?? null, factorToBase: u.factorToBase ?? null }
    });
  }

  // 5) Spec Definitions
  for (const s of data.specDefinitions) {
    await prisma.productSpecDefinition.upsert({
      where: { slug: s.slug },
      update: { name: s.name },
      create: { slug: s.slug, name: s.name }
    });
  }

  // 6) Products
  for (const p of data.products) {
    const brand = p.brandSlug ? await prisma.brand.findUnique({ where: { slug: p.brandSlug } }) : null;
    const type  = await prisma.productType.findFirst({ where: { slug: p.typeSlug } });
    if (!type) throw new Error(`ProductType not found: ${p.typeSlug}`);

    const unit  = p.unitName ? await prisma.unitDefinition.findUnique({ where: { name: p.unitName } }) : null;

    // Create Product with nested specs & images
    const created = await prisma.product.create({
      data: {
        slug: p.slug,
        name: p.name,
        sku: p.sku,
        description: p.description ?? null,
        coverImage: p.coverImage ?? null,

        price: p.price,
        listPrice: p.listPrice ?? null,
        currency: p.currency ?? "VND",
        stockOnHand: p.stockOnHand ?? 0,

        type: { connect: { id: type.id } },
        ...(brand ? { brand: { connect: { id: brand.id } } } : {}),

        ...(unit ? { unit: { connect: { id: unit.id } } } : {}),
        quantityValue: p.quantityValue ?? null,
        quantityLabel: p.quantityLabel ?? null,

        specs: p.specs?.length ? {
          create: p.specs.map((s: any, idx: number) => ({
            specDefinition: { connect: { slug: s.specSlug } },
            valueString: s.valueString ?? null,
            valueNumber: s.valueNumber ?? null,
            valueBoolean: s.valueBoolean ?? null,
            unitOverride: s.unitOverride ?? null,
            sortOrder: idx
          }))
        } : undefined,

        images: p.images?.length ? {
          create: p.images.map((i: any, idx: number) => ({
            url: i.url,
            alt: i.alt ?? null,
            sortOrder: idx + 1
          }))
        } : undefined
      }
    });

    // Many-to-many Category links
    for (const slug of p.categorySlugs ?? []) {
      const cat = await prisma.productCategory.findUnique({ where: { slug } });
      if (cat) {
        await prisma.productCategoryLink.create({
          data: { productId: created.id, categoryId: cat.id }
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
