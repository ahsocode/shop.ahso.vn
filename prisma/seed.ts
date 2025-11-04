
import { prisma } from "../lib/prisma";
import bcrypt from "bcrypt";

async function main() {
  const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@local.test";
  const ADMIN_USER  = process.env.ADMIN_USERNAME || "adminahso";
  const ADMIN_PASS  = process.env.ADMIN_PASSWORD || "Adminshopahsovn2025";


  const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
  if (adminCount > 0) {
    console.log("Admin already exists, skipping create.");
    return;
  }

  const passwordHash = await bcrypt.hash(ADMIN_PASS, 12);
  const ship = await prisma.address.create({
    data: { line1: "Admin HQ", city: "HN", country: "VN" },
  });

  const user = await prisma.user.create({
    data: {
      username: ADMIN_USER.toLowerCase(),
      fullName: "System Administrator",
      email: ADMIN_EMAIL.toLowerCase(),
      phoneE164: "+84000000000",
      passwordHash,
      role: "ADMIN",
      shippingAddressId: ship.id,
      billingAddressId: ship.id,
    },
    select: { id: true, email: true, role: true },
  });

  console.log("Admin created:", user);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
