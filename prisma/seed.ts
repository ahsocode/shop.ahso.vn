
import { randomUUID } from "crypto";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const now = () => new Date();
const randomPrice = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

async function ensureAddress(payload: {
  line1: string;
  line2?: string | null;
  city: string;
  state?: string | null;
  postalCode?: string | null;
  country?: string | null;
}) {
  return prisma.address.create({
    data: {
      id: randomUUID(),
      line1: payload.line1,
      line2: payload.line2 ?? null,
      city: payload.city,
      state: payload.state ?? null,
      postalCode: payload.postalCode ?? null,
      country: payload.country ?? "VN",
      updatedAt: now(),
    },
  });
}

async function main() {
  // Admin user only
  const adminUsername = process.env.SEED_ADMIN_USERNAME || "admin";
  const adminEmail = process.env.SEED_ADMIN_EMAIL || "admin@ahso.vn";
  const adminPhone = process.env.SEED_ADMIN_PHONE || "+84999999999";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || "AdminAHSO2025@";

  const existingAdmin = await prisma.user.findUnique({ where: { username: adminUsername } });
  const passwordHash = await bcrypt.hash(adminPassword, 10);

  if (existingAdmin) {
    let shippingId = existingAdmin.shippingAddressId;
    let billingId = existingAdmin.billingAddressId;

    if (!shippingId) {
      const shipping = await ensureAddress({
        line1: "Số 1 Đường Mẫu",
        city: "Hà Nội",
        postalCode: "100000",
      });
      shippingId = shipping.id;
    }

    if (!billingId) {
      const billing = await ensureAddress({
        line1: "Số 1 Đường Mẫu",
        city: "Hà Nội",
        postalCode: "100000",
      });
      billingId = billing.id;
    }

    await prisma.user.update({
      where: { id: existingAdmin.id },
      data: {
        passwordHash,
        fullName: existingAdmin.fullName || "Administrator",
        email: adminEmail,
        phoneE164: adminPhone,
        role: "ADMIN",
        shippingAddressId: shippingId,
        billingAddressId: billingId,
        emailVerified: true,
        updatedAt: now(),
      },
    });
    console.log("✅ Đã cập nhật tài khoản admin");
  } else {
    const shipping = await ensureAddress({
      line1: "Số 1 Đường Mẫu",
      city: "Hà Nội",
      postalCode: "100000",
    });
    const billing = await ensureAddress({
      line1: "Số 1 Đường Mẫu",
      city: "Hà Nội",
      postalCode: "100000",
    });

    await prisma.user.create({
      data: {
        id: randomUUID(),
        username: adminUsername,
        passwordHash,
        fullName: "Administrator",
        email: adminEmail,
        phoneE164: adminPhone,
        taxCode: null,
        emailVerified: true,
        createdAt: now(),
        updatedAt: now(),
        shippingAddressId: shipping.id,
        billingAddressId: billing.id,
        role: "ADMIN",
        avatarUrl: "/logo.png",
        isBlocked: false,
      },
    });
    console.log("✅ Đã tạo tài khoản admin");
  }

  const createdAt = now();

  const productCategories = Array.from({ length: 5 }, (_, i) => ({
    name: `Danh muc ${i + 1}`,
    slug: `danh-muc-${i + 1}`,
    description: `Danh muc mau ${i + 1}`,
  }));

  const productCategoryRecords = [];
  for (const category of productCategories) {
    const record = await prisma.productcategory.upsert({
      where: { slug: category.slug },
      update: {
        name: category.name,
        description: category.description,
        updatedAt: now(),
      },
      create: {
        id: randomUUID(),
        name: category.name,
        slug: category.slug,
        description: category.description,
        createdAt,
        updatedAt: now(),
      },
    });
    productCategoryRecords.push(record);
  }

  const productTypes = [];
  for (const [categoryIndex, category] of productCategoryRecords.entries()) {
    for (let typeIndex = 0; typeIndex < 2; typeIndex += 1) {
      const slug = `loai-${categoryIndex + 1}-${typeIndex + 1}`;
      const type = await prisma.producttype.upsert({
        where: {
          categoryId_slug: {
            categoryId: category.id,
            slug,
          },
        },
        update: {
          name: `Loai ${categoryIndex + 1}.${typeIndex + 1}`,
          updatedAt: now(),
        },
        create: {
          id: randomUUID(),
          categoryId: category.id,
          slug,
          name: `Loai ${categoryIndex + 1}.${typeIndex + 1}`,
          description: `Loai san pham ${categoryIndex + 1}.${typeIndex + 1}`,
          createdAt,
          updatedAt: now(),
        },
      });
      productTypes.push({ ...type, categoryId: category.id });
    }
  }

  const productCategoryLinks: { productId: string; categoryId: string }[] = [];

  for (const type of productTypes) {
    for (let productIndex = 0; productIndex < 2; productIndex += 1) {
      const sku = `SKU-${type.slug}-${productIndex + 1}`;
      const slug = `san-pham-${type.slug}-${productIndex + 1}`;
      const price = randomPrice(100000, 5000000);
      const product = await prisma.product.upsert({
        where: { sku },
        update: {
          name: `San pham ${type.slug} ${productIndex + 1}`,
          slug,
          price,
          listPrice: price + 50000,
          stockOnHand: 99,
          status: "PUBLISHED",
          typeId: type.id,
          updatedAt: now(),
        },
        create: {
          id: randomUUID(),
          sku,
          slug,
          name: `San pham ${type.slug} ${productIndex + 1}`,
          description: `Mo ta san pham ${type.slug} ${productIndex + 1}`,
          price,
          listPrice: price + 50000,
          stockOnHand: 99,
          status: "PUBLISHED",
          createdAt,
          typeId: type.id,
          currency: "VND",
        },
      });
      productCategoryLinks.push({ productId: product.id, categoryId: type.categoryId });
    }
  }

  if (productCategoryLinks.length) {
    await prisma.productcategorylink.createMany({
      data: productCategoryLinks,
      skipDuplicates: true,
    });
  }

  const solutionCategories = Array.from({ length: 5 }, (_, i) => ({
    name: `Solution Category ${i + 1}`,
    slug: `solution-category-${i + 1}`,
    description: `Solution category ${i + 1}`,
  }));

  const solutionCategoryRecords = [];
  for (const category of solutionCategories) {
    const record = await prisma.solutioncategory.upsert({
      where: { slug: category.slug },
      update: {
        name: category.name,
        description: category.description,
        updatedAt: now(),
      },
      create: {
        id: randomUUID(),
        name: category.name,
        slug: category.slug,
        description: category.description,
        createdAt,
        updatedAt: now(),
      },
    });
    solutionCategoryRecords.push(record);
  }

  for (const [categoryIndex, category] of solutionCategoryRecords.entries()) {
    for (let itemIndex = 0; itemIndex < 2; itemIndex += 1) {
      const slug = `solution-${categoryIndex + 1}-${itemIndex + 1}`;
      await prisma.solution.upsert({
        where: { slug },
        update: {
          title: `Solution ${categoryIndex + 1}.${itemIndex + 1}`,
          summary: `Solution summary ${categoryIndex + 1}.${itemIndex + 1}`,
          bodyHtml: `<p>Solution noi dung ${categoryIndex + 1}.${itemIndex + 1}</p>`,
          status: "PUBLISHED",
          publishedAt: now(),
          categoryId: category.id,
          updatedAt: now(),
        },
        create: {
          id: randomUUID(),
          title: `Solution ${categoryIndex + 1}.${itemIndex + 1}`,
          slug,
          summary: `Solution summary ${categoryIndex + 1}.${itemIndex + 1}`,
          bodyHtml: `<p>Solution noi dung ${categoryIndex + 1}.${itemIndex + 1}</p>`,
          status: "PUBLISHED",
          publishedAt: now(),
          categoryId: category.id,
          createdAt,
          updatedAt: now(),
        },
      });
    }
  }

  const softwareCategories = Array.from({ length: 5 }, (_, i) => ({
    name: `Software Category ${i + 1}`,
    slug: `software-category-${i + 1}`,
    description: `Software category ${i + 1}`,
  }));

  const softwareCategoryRecords = [];
  for (const category of softwareCategories) {
    const record = await prisma.softwarecategory.upsert({
      where: { slug: category.slug },
      update: {
        name: category.name,
        description: category.description,
        updatedAt: now(),
      },
      create: {
        id: randomUUID(),
        name: category.name,
        slug: category.slug,
        description: category.description,
        createdAt,
        updatedAt: now(),
      },
    });
    softwareCategoryRecords.push(record);
  }

  for (const [categoryIndex, category] of softwareCategoryRecords.entries()) {
    for (let itemIndex = 0; itemIndex < 2; itemIndex += 1) {
      const slug = `software-${categoryIndex + 1}-${itemIndex + 1}`;
      await prisma.software.upsert({
        where: { slug },
        update: {
          title: `Software ${categoryIndex + 1}.${itemIndex + 1}`,
          summary: `Software summary ${categoryIndex + 1}.${itemIndex + 1}`,
          bodyHtml: `<p>Software noi dung ${categoryIndex + 1}.${itemIndex + 1}</p>`,
          status: "PUBLISHED",
          publishedAt: now(),
          categoryId: category.id,
          updatedAt: now(),
        },
        create: {
          id: randomUUID(),
          title: `Software ${categoryIndex + 1}.${itemIndex + 1}`,
          slug,
          summary: `Software summary ${categoryIndex + 1}.${itemIndex + 1}`,
          bodyHtml: `<p>Software noi dung ${categoryIndex + 1}.${itemIndex + 1}</p>`,
          status: "PUBLISHED",
          publishedAt: now(),
          categoryId: category.id,
          createdAt,
          updatedAt: now(),
        },
      });
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
