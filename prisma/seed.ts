
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
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
