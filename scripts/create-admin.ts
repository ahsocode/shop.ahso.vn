import { randomUUID } from "crypto";
import bcrypt from "bcrypt";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const username = (process.argv[2] || "admin").toLowerCase();
  const password = process.argv[3] || "AdminAHSO2025@";

  // Minimal placeholders to satisfy required fields
  const fullName = "AHSO Admin";
  const email = `${username}@example.local`;
  const phoneE164 = "+84000000000";

  const passwordHash = await bcrypt.hash(password, 12);

  // Create a minimal address once
  const addr = await prisma.address.create({
    data: {
      id: randomUUID(),
      line1: "Bootstrap Admin Address",
      city: "HCM",
      country: "VN",
      updatedAt: new Date(),
    },
  });

  // Upsert user by username
  const user = await prisma.user.upsert({
    where: { username },
    update: {
      passwordHash,
      role: "ADMIN",
      fullName,
      email,
      phoneE164,
      shippingAddressId: addr.id,
      billingAddressId: addr.id,
    },
    create: {
      id: randomUUID(),
      username,
      passwordHash,
      fullName,
      email,
      phoneE164,
      role: "ADMIN",
      shippingAddressId: addr.id,
      billingAddressId: addr.id,
      updatedAt: new Date(),
    },
    select: { id: true, username: true, role: true, email: true, phoneE164: true, createdAt: true },
  });

  console.log("✔ Admin ready:", user);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
