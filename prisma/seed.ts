import { randomUUID } from "crypto";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const now = () => new Date();

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

async function ensureAdmin() {
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
      const shipping = await ensureAddress({ line1: "Số 1 Đường Mẫu", city: "Hà Nội", postalCode: "100000" });
      shippingId = shipping.id;
    }

    if (!billingId) {
      const billing = await ensureAddress({ line1: "Số 1 Đường Mẫu", city: "Hà Nội", postalCode: "100000" });
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
    console.log("Đã cập nhật tài khoản admin");
    return;
  }

  const shipping = await ensureAddress({ line1: "Số 1 Đường Mẫu", city: "Hà Nội", postalCode: "100000" });
  const billing = await ensureAddress({ line1: "Số 1 Đường Mẫu", city: "Hà Nội", postalCode: "100000" });

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
  console.log("Đã tạo tài khoản admin");
}

async function seedContent() {
  const solutionCategory = await prisma.solutioncategory.upsert({
    where: { slug: "giai-phap-doanh-nghiep" },
    update: { name: "Giải pháp doanh nghiệp", updatedAt: now() },
    create: {
      id: randomUUID(),
      name: "Giải pháp doanh nghiệp",
      slug: "giai-phap-doanh-nghiep",
      description: "Nhóm giải pháp mẫu",
      updatedAt: now(),
    },
  });

  const softwareCategory = await prisma.softwarecategory.upsert({
    where: { slug: "phan-mem-quan-ly" },
    update: { name: "Phần mềm quản lý", updatedAt: now() },
    create: {
      id: randomUUID(),
      name: "Phần mềm quản lý",
      slug: "phan-mem-quan-ly",
      description: "Nhóm phần mềm mẫu",
      updatedAt: now(),
    },
  });

  const solution = await prisma.solution.upsert({
    where: { slug: "giai-phap-chuyen-doi-so" },
    update: {
      title: "Giải pháp chuyển đổi số",
      summary: "Giải pháp mẫu cho doanh nghiệp.",
      categoryId: solutionCategory.id,
      updatedAt: now(),
    },
    create: {
      id: randomUUID(),
      title: "Giải pháp chuyển đổi số",
      slug: "giai-phap-chuyen-doi-so",
      summary: "Giải pháp mẫu cho doanh nghiệp.",
      bodyHtml: "<p>Nội dung giải pháp mẫu.</p>",
      status: "PUBLISHED",
      publishedAt: now(),
      categoryId: solutionCategory.id,
      updatedAt: now(),
    },
  });

  const software = await prisma.software.upsert({
    where: { slug: "phan-mem-quan-ly-van-hanh" },
    update: {
      title: "Phần mềm quản lý vận hành",
      summary: "Phần mềm mẫu cho doanh nghiệp.",
      categoryId: softwareCategory.id,
      updatedAt: now(),
    },
    create: {
      id: randomUUID(),
      title: "Phần mềm quản lý vận hành",
      slug: "phan-mem-quan-ly-van-hanh",
      summary: "Phần mềm mẫu cho doanh nghiệp.",
      bodyHtml: "<p>Nội dung phần mềm mẫu.</p>",
      status: "PUBLISHED",
      publishedAt: now(),
      categoryId: softwareCategory.id,
      updatedAt: now(),
    },
  });

  await prisma.featuredsolution.upsert({
    where: { solutionId: solution.id },
    update: { isActive: true, sortOrder: 0 },
    create: { solutionId: solution.id, isActive: true, sortOrder: 0 },
  });

  await prisma.featuredsoftware.upsert({
    where: { softwareId: software.id },
    update: { isActive: true, sortOrder: 0 },
    create: { softwareId: software.id, isActive: true, sortOrder: 0 },
  });

  await prisma.policysection.upsert({
    where: { id: "default-policy" },
    update: { name: "Chính sách chung", content: "<p>Nội dung chính sách đang được cập nhật.</p>" },
    create: {
      id: "default-policy",
      name: "Chính sách chung",
      content: "<p>Nội dung chính sách đang được cập nhật.</p>",
    },
  });
}

async function main() {
  await ensureAdmin();
  await seedContent();
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
