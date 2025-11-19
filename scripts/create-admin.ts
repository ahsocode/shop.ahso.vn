import { randomUUID } from "crypto";
import bcrypt from "bcrypt";
import { PrismaClient } from "@/generated/client";

const prisma = new PrismaClient();

async function main() {
  const username = (process.argv[2] || "duyhai0308").toLowerCase();
  const password = process.argv[3] || "DuyHai03082003@gmail.com";

  // Minimal placeholders to satisfy required fields
  const fullName = "Duy Hai";
  const email = `duyhai03082003@gmail.com`;
  const phoneE164 = "0856686130";

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
