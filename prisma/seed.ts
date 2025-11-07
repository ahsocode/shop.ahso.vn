// prisma/seed.ts
import { PrismaClient } from '@prisma/client';
import productSeed from './product-seed.json' assert { type: 'json' };
import solutions from './solutions-seed.json' assert { type: 'json' };
import softwares from './software-seed.json' assert { type: 'json' };

const prisma = new PrismaClient();

type ProductSeed = {
  brands: any[];
  categories: any[];              // { id, name, slug, fullSlug, level, parentId, ... }
  products: any[];                // { id, title, slug, sku, ... }
  productImages: any[];           // { id, productId, url, alt, sortOrder, ... }
  productVariants: any[];         // { id, productId, variantSku, price (string), ... }
  productSpecs: any[];            // { id, variantId, keySlug, label, valueText, valueNumber, unit, sortOrder... }
  productCategoryLinks: any[];    // { productId, categoryId }
  productDocs?: any[];
};

function toDecimalString(x: any): string | null {
  if (x === null || x === undefined) return null;
  if (typeof x === 'string') return x;
  if (typeof x === 'number') return x.toFixed(2);
  try {
    const f = parseFloat(x);
    if (Number.isFinite(f)) return f.toFixed(2);
  } catch {}
  return null;
}

async function seedProductsCatalog(seed: ProductSeed) {
  const {
    brands,
    categories,
    products,
    productImages,
    productVariants,
    productSpecs,
    productCategoryLinks,
    productDocs = [],
  } = seed;

  // 1) Brands
  if (brands?.length) {
    await prisma.brand.createMany({
      data: brands.map(b => ({
        id: b.id,
        name: b.name,
        slug: b.slug,
        originCountryCode: b.originCountryCode ?? null,
        logoUrl: b.logoUrl ?? null,
        variantCount: b.variantCount ?? 0,
        createdAt: b.createdAt ? new Date(b.createdAt) : undefined,
        updatedAt: b.updatedAt ? new Date(b.updatedAt) : undefined,
      })),
      skipDuplicates: true,
    });
  }

  // 2) Categories (đã có sẵn id/parentId trong JSON → tạo trực tiếp)
  if (categories?.length) {
    // tạo cha trước (level=0), rồi tạo con (level>0) để tránh lỗi FK parentId
    const roots = categories.filter(c => !c.parentId).sort((a,b)=>a.level-b.level);
    const childs = categories.filter(c => c.parentId).sort((a,b)=>a.level-b.level);

    if (roots.length) {
      await prisma.category.createMany({
        data: roots.map(c => ({
          id: c.id,
          name: c.name,
          slug: c.slug,
          fullSlug: c.fullSlug,
          level: c.level ?? 0,
          description: c.description ?? null,
          icon: c.icon ?? null,
          parentId: null,
          productCount: c.productCount ?? 0,
          variantCount: c.variantCount ?? 0,
          createdAt: c.createdAt ? new Date(c.createdAt) : undefined,
          updatedAt: c.updatedAt ? new Date(c.updatedAt) : undefined,
        })),
        skipDuplicates: true,
      });
    }

    if (childs.length) {
      await prisma.category.createMany({
        data: childs.map(c => ({
          id: c.id,
          name: c.name,
          slug: c.slug,
          fullSlug: c.fullSlug,
          level: c.level ?? 1,
          description: c.description ?? null,
          icon: c.icon ?? null,
          parentId: c.parentId,
          productCount: c.productCount ?? 0,
          variantCount: c.variantCount ?? 0,
          createdAt: c.createdAt ? new Date(c.createdAt) : undefined,
          updatedAt: c.updatedAt ? new Date(c.updatedAt) : undefined,
        })),
        skipDuplicates: true,
      });
    }
  }

  // 3) Products
  if (products?.length) {
    await prisma.product.createMany({
      data: products.map(p => ({
        id: p.id,
        title: p.title,
        slug: p.slug,
        sku: p.sku,
        mpn: p.mpn ?? null,
        summary: p.summary ?? null,
        descriptionHtml: p.descriptionHtml ?? null,
        imagesCover: p.imagesCover ?? null,
        unit: p.unit ?? 'PCS',
        metaTitle: p.metaTitle ?? null,
        metaDescription: p.metaDescription ?? null,
        canonicalUrl: p.canonicalUrl ?? null,
        status: p.status ?? 'PUBLISHED',
        publishAt: p.publishAt ? new Date(p.publishAt) : null,
        brandId: p.brandId ?? null,
        madeInCountryCode: p.madeInCountryCode ?? null,
        madeInNote: p.madeInNote ?? null,
        priceMin: toDecimalString(p.priceMin),
        priceMax: toDecimalString(p.priceMax),
        variantCount: p.variantCount ?? 0,
        createdAt: p.createdAt ? new Date(p.createdAt) : undefined,
        updatedAt: p.updatedAt ? new Date(p.updatedAt) : undefined,
      })),
      skipDuplicates: true,
    });
  }

  // 4) Product Images
  if (productImages?.length) {
    await prisma.productImage.createMany({
      data: productImages.map(im => ({
        id: im.id,
        productId: im.productId,
        url: im.url,
        alt: im.alt ?? null,
        sortOrder: im.sortOrder ?? 0,
        createdAt: im.createdAt ? new Date(im.createdAt) : undefined,
        updatedAt: im.updatedAt ? new Date(im.updatedAt) : undefined,
      })),
      skipDuplicates: true,
    });
  }

  // 5) Product Variants (Decimal → string)
  if (productVariants?.length) {
    await prisma.productVariant.createMany({
      data: productVariants.map(v => ({
        id: v.id,
        productId: v.productId,
        variantSku: v.variantSku,
        mpn: v.mpn ?? null,
        barcode: v.barcode ?? null,
        brandId: v.brandId ?? null,
        attributes: v.attributes ?? {},
        price: toDecimalString(v.price)!,            // Decimal(12,2)
        listPrice: toDecimalString(v.listPrice),     // Decimal(12,2) | null
        currency: v.currency ?? 'VND',
        taxIncluded: v.taxIncluded ?? true,
        stockOnHand: v.stockOnHand ?? 0,
        stockReserved: v.stockReserved ?? 0,
        warehouseId: v.warehouseId ?? null,
        leadTimeDays: v.leadTimeDays ?? null,
        minOrderQty: v.minOrderQty ?? 1,
        packInner: v.packInner ?? null,
        packOuter: v.packOuter ?? null,
        weightGrams: v.weightGrams ?? null,
        lengthMm: v.lengthMm ?? null,
        widthMm: v.widthMm ?? null,
        heightMm: v.heightMm ?? null,
        madeInCountryCode: v.madeInCountryCode ?? null,
        madeInNote: v.madeInNote ?? null,
        createdAt: v.createdAt ? new Date(v.createdAt) : undefined,
        updatedAt: v.updatedAt ? new Date(v.updatedAt) : undefined,
      })),
      skipDuplicates: true,
    });
  }

  // 6) Product Specs (variant-only, đúng schema mới)
  if (productSpecs?.length) {
    // loại bỏ bản ghi thiếu variantId để tránh FK fail
    const safeSpecs = productSpecs.filter(sp => !!sp.variantId);
    await prisma.productSpec.createMany({
      data: safeSpecs.map(sp => ({
        id: sp.id,
        variantId: sp.variantId,
        keySlug: sp.keySlug,
        label: sp.label,
        valueText: sp.valueText ?? null,
        valueNumber: sp.valueNumber ?? null, // chuỗi Decimal(20,6) cũng ok
        unit: sp.unit ?? null,
        sortOrder: sp.sortOrder ?? 0,
        createdAt: sp.createdAt ? new Date(sp.createdAt) : undefined,
        updatedAt: sp.updatedAt ? new Date(sp.updatedAt) : undefined,
      })),
      skipDuplicates: true,
    });
  }

  // 7) ProductCategory links (bảng nối)
  if (productCategoryLinks?.length) {
    await prisma.productCategory.createMany({
      data: productCategoryLinks.map(l => ({
        productId: l.productId,
        categoryId: l.categoryId,
      })),
      skipDuplicates: true,
    });
  }

  // 8) (Optional) Product Docs
  if (productDocs?.length) {
    await prisma.productDoc.createMany({
      data: productDocs.map(d => ({
        id: d.id,
        productId: d.productId,
        title: d.title,
        fileUrl: d.fileUrl,
        type: d.type ?? 'DATASHEET',
        createdAt: d.createdAt ? new Date(d.createdAt) : undefined,
        updatedAt: d.updatedAt ? new Date(d.updatedAt) : undefined,
      })),
      skipDuplicates: true,
    });
  }
}

async function seedSolutionsAndSoftware() {
  // Seed Solutions
  for (const s of solutions as any[]) {
    const slugCat = s.category.toLowerCase().replace(/\s+/g, '-');

    const category = await prisma.solutionCategory.upsert({
      where: { slug: slugCat },
      update: {},
      create: { name: s.category, slug: slugCat },
    });

    await prisma.solution.upsert({
      where: { slug: s.slug },
      update: {
        title: s.title,
        summary: s.summary,
        coverImage: s.coverImage,
        bodyHtml: s.bodyHtml,
        industry: s.industry,
        usecase: s.usecase,
        status: 'PUBLISHED',
        publishedAt: new Date(),
        categoryId: category.id,
      },
      create: {
        title: s.title,
        slug: s.slug,
        summary: s.summary,
        coverImage: s.coverImage,
        bodyHtml: s.bodyHtml,
        industry: s.industry,
        usecase: s.usecase,
        status: 'PUBLISHED',
        publishedAt: new Date(),
        categoryId: category.id,
        images: { create: s.images ?? [] },
      },
    });
  }

  // Seed Software
  for (const sw of softwares as any[]) {
    const catSlug = (sw.categorySlug || sw.category || 'uncategorized')
      .toString().toLowerCase().replace(/\s+/g, '-');

    const category = await prisma.softwareCategory.upsert({
      where: { slug: catSlug },
      update: {},
      create: { name: sw.category || sw.categorySlug || 'Uncategorized', slug: catSlug },
    });

    await prisma.software.upsert({
      where: { slug: sw.slug },
      update: {
        title: sw.title,
        summary: sw.summary,
        coverImage: sw.coverImage,
        bodyHtml: sw.bodyHtml,
        status: 'PUBLISHED',
        publishedAt: new Date(),
        categoryId: category.id,
        metaTitle: sw.metaTitle ?? null,
        metaDescription: sw.metaDescription ?? null,
        canonicalUrl: sw.canonicalUrl ?? null,
      },
      create: {
        title: sw.title,
        slug: sw.slug,
        summary: sw.summary,
        coverImage: sw.coverImage,
        bodyHtml: sw.bodyHtml,
        status: 'PUBLISHED',
        publishedAt: new Date(),
        categoryId: category.id,
        metaTitle: sw.metaTitle ?? null,
        metaDescription: sw.metaDescription ?? null,
        canonicalUrl: sw.canonicalUrl ?? null,
      },
    });
  }
}

async function main() {
  // 1) Seed Product Catalog (brands/categories/products/variants/specs/links/images/docs)
  await seedProductsCatalog(productSeed as ProductSeed);

  // 2) Seed Solutions & Software (giữ nguyên)
  await seedSolutionsAndSoftware();
}

main()
  .then(() => console.log('✔ Seed xong: Products + Solutions + Software'))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
