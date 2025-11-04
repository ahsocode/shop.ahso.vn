// app/api/admin/users/staff/route.ts
import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { z } from "zod";
import { prisma } from "../../../../../lib/prisma";
import { verifyBearerAuth, requireRole } from "../../../../../lib/auth";

// Có thể tái sử dụng addressSchema từ file register, copy sang đây cho gọn:
const addressSchema = z.object({
  line1: z.string().min(1),
  line2: z.string().optional(),
  city: z.string().min(1),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().length(2),
});

const createStaffSchema = z.object({
  username: z.string().min(3).max(32).regex(/^[a-z0-9_.-]+$/),
  password: z.string().min(8),
  fullName: z.string().min(1).max(128),
  phone: z.string().min(9).max(20),
  email: z.string().email(),
  shippingAddress: addressSchema,
  billingAddress: addressSchema.optional(),
  taxCode: z.string().regex(/^\d{10}(\d{3})?$/).optional(),
});

const PHONE_VN_REGEX = /^(?:\+?84|0)(\d{9})$/;
const toE164VN = (input: string) => {
  const s = input.replace(/\s|-/g, "");
  const m = s.match(PHONE_VN_REGEX);
  if (!m) return s.startsWith("+") ? s : s;
  return `+84${m[1]}`;
};
const normCountry2 = (s: string) => s.toUpperCase();
const addressesEqual = (a: z.infer<typeof addressSchema>, b: z.infer<typeof addressSchema>) =>
  a.line1 === b.line1 &&
  (a.line2 ?? "") === (b.line2 ?? "") &&
  a.city === b.city &&
  (a.state ?? "") === (b.state ?? "") &&
  (a.postalCode ?? "") === (b.postalCode ?? "") &&
  normCountry2(a.country) === normCountry2(b.country);

export async function POST(req: Request) {
  const me = await verifyBearerAuth(req);
  if (!requireRole(me, ["ADMIN"])) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createStaffSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const data = parsed.data;
  const username = data.username.toLowerCase();
  const email = data.email.toLowerCase();
  const phoneE164 = toE164VN(data.phone);
  const shipping = { ...data.shippingAddress, country: normCountry2(data.shippingAddress.country) };
  const billingInput = data.billingAddress
    ? { ...data.billingAddress, country: normCountry2(data.billingAddress.country) }
    : undefined;

  // Ngăn tạo thêm ADMIN qua route này (chỉ STAFF)
  // (nếu sau này bạn cần promote role, tạo route riêng có kiểm soát)
  const conflict = await prisma.user.findFirst({
    where: { OR: [{ email }, { username }, { phoneE164 }] },
    select: { id: true },
  });
  if (conflict) {
    return NextResponse.json(
      { error: "CONFLICT", message: "email/username/phone đã tồn tại" },
      { status: 409 }
    );
  }

  const passwordHash = await bcrypt.hash(data.password, 12);

  const user = await prisma.$transaction(async (tx) => {
    const shipAddr = await tx.address.create({
      data: {
        line1: shipping.line1,
        line2: shipping.line2 ?? null,
        city: shipping.city,
        state: shipping.state ?? null,
        postalCode: shipping.postalCode ?? null,
        country: shipping.country,
      },
    });

    let billingAddrId = shipAddr.id;
    if (billingInput && !addressesEqual(shipping, billingInput)) {
      const billAddr = await tx.address.create({
        data: {
          line1: billingInput.line1,
          line2: billingInput.line2 ?? null,
          city: billingInput.city,
          state: billingInput.state ?? null,
          postalCode: billingInput.postalCode ?? null,
          country: billingInput.country,
        },
      });
      billingAddrId = billAddr.id;
    }

    return tx.user.create({
      data: {
        username,
        passwordHash,
        fullName: data.fullName,
        email,
        phoneE164,
        taxCode: data.taxCode ?? null,
        shippingAddressId: shipAddr.id,
        billingAddressId: billingAddrId,
        role: "STAFF", // <— STAFF
      },
      select: {
        id: true,
        username: true,
        fullName: true,
        email: true,
        phoneE164: true,
        role: true,
        createdAt: true,
      },
    });
  });

  return NextResponse.json({ user }, { status: 201 });
}
