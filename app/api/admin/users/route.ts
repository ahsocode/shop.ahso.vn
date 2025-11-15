import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma, prismaSupportsUserBlockField } from "../../../../lib/prisma";
import { verifyBearerAuth, requireRole, UnauthorizedError, ForbiddenError } from "../../../../lib/auth";

const baseAddressSchema = z.object({
  line1: z.string().min(1),
  line2: z.string().optional(),
  city: z.string().min(1),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().length(2),
});
const addressSchema = baseAddressSchema.optional();
type AddressPayload = z.infer<typeof baseAddressSchema>;

type AdminUserRow = {
  id: string;
  username: string;
  fullName: string;
  email: string;
  phoneE164: string;
  role: string;
  createdAt: Date;
  isBlocked: boolean;
};

const BASE_ADMIN_USER_SELECT = {
  id: true,
  username: true,
  fullName: true,
  email: true,
  phoneE164: true,
  role: true,
  createdAt: true,
} satisfies Prisma.UserSelect;

const adminUserSelect: Prisma.UserSelect = prismaSupportsUserBlockField
  ? { ...BASE_ADMIN_USER_SELECT, isBlocked: true }
  : BASE_ADMIN_USER_SELECT;

const createUserSchema = z.object({
  // Cho phép hoa/thường, server sẽ lưu lowercase
  username: z.string().min(3).max(32).regex(/^[a-zA-Z0-9_.-]+$/),
  password: z.string().min(8),
  fullName: z.string().min(1).max(128),
  phone: z.string().min(9).max(20),
  email: z.string().email(),
  shippingAddress: addressSchema,
  billingAddress: addressSchema,
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
const addressesEqual = (a?: AddressPayload, b?: AddressPayload) =>
  !!a &&
  !!b &&
  a.line1 === b.line1 &&
  (a.line2 ?? "") === (b.line2 ?? "") &&
  a.city === b.city &&
  (a.state ?? "") === (b.state ?? "") &&
  (a.postalCode ?? "") === (b.postalCode ?? "") &&
  normCountry2(a.country) === normCountry2(b.country);

function toInt(v: string | null, def = 1) {
  const n = v ? Number(v) : NaN;
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : def;
}

export async function GET(req: NextRequest) {
  try {
    const me = await verifyBearerAuth(req);
    requireRole(me, ["ADMIN"]);

    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();
    const role = (searchParams.get("role") || "").trim(); // USER|STAFF|ADMIN
    const page = toInt(searchParams.get("page"), 1);
    const pageSize = toInt(searchParams.get("pageSize"), 20);

    const where: Prisma.UserWhereInput = {};
    if (role) where.role = role as Prisma.UserScalarWhereWithAggregatesInput["role"];
    if (q) where.OR = [
      { username: { contains: q } },
      { fullName: { contains: q } },
      { email: { contains: q } },
      { phoneE164: { contains: q } },
    ];

    const [total, rawRows] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: adminUserSelect,
      }),
    ]);

    const rows: AdminUserRow[] = prismaSupportsUserBlockField
      ? (rawRows as AdminUserRow[])
      : (rawRows as Omit<AdminUserRow, "isBlocked">[]).map((row) => ({ ...row, isBlocked: false }));

    return NextResponse.json({ data: rows, meta: { total, page, pageSize, blockable: prismaSupportsUserBlockField } });
  } catch (e) {
    if (e instanceof UnauthorizedError || e instanceof ForbiddenError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error("List users error:", e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const me = await verifyBearerAuth(req);
    requireRole(me, ["ADMIN"]);

    const body = await req.json();
    const parsed = createUserSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "VALIDATION_ERROR", details: parsed.error.flatten() }, { status: 400 });
    }

    const data = parsed.data;
    const username = data.username.toLowerCase();
    const email = data.email.toLowerCase();
    const phoneE164 = toE164VN(data.phone);

    const conflict = await prisma.user.findFirst({ where: { OR: [{ email }, { username }, { phoneE164 }] }, select: { id: true } });
    if (conflict) return NextResponse.json({ error: "CONFLICT", message: "email/username/phone đã tồn tại" }, { status: 409 });

    const passwordHash = await bcrypt.hash(data.password, 12);

    const shippingInput = data.shippingAddress ?? { line1: "Admin Created", city: "HCM", country: "VN" };
    const shipNorm: AddressPayload = {
      line1: shippingInput.line1,
      line2: shippingInput.line2,
      city: shippingInput.city,
      state: shippingInput.state,
      postalCode: shippingInput.postalCode,
      country: normCountry2(shippingInput.country),
    };
    const billingInput = data.billingAddress;
    const billNorm: AddressPayload | undefined = billingInput
      ? {
          line1: billingInput.line1,
          line2: billingInput.line2,
          city: billingInput.city,
          state: billingInput.state,
          postalCode: billingInput.postalCode,
          country: normCountry2(billingInput.country),
        }
      : undefined;

    const user = await prisma.$transaction(async (tx) => {
      const shipAddr = await tx.address.create({ data: { line1: shipNorm.line1, line2: shipNorm.line2 ?? null, city: shipNorm.city, state: shipNorm.state ?? null, postalCode: shipNorm.postalCode ?? null, country: shipNorm.country } });
      let billingAddrId = shipAddr.id;
      if (billNorm && !addressesEqual(shipNorm, billNorm)) {
        const billAddr = await tx.address.create({ data: { line1: billNorm.line1, line2: billNorm.line2 ?? null, city: billNorm.city, state: billNorm.state ?? null, postalCode: billNorm.postalCode ?? null, country: billNorm.country } });
        billingAddrId = billAddr.id;
      }

      const created = await tx.user.create({
        data: {
          username,
          passwordHash,
          fullName: data.fullName,
          email,
          phoneE164,
          taxCode: data.taxCode ?? null,
          shippingAddressId: shipAddr.id,
          billingAddressId: billingAddrId,
          role: "USER",
        },
        select: adminUserSelect,
      });

      return created;
    });

    const normalizedUser: AdminUserRow = prismaSupportsUserBlockField
      ? (user as AdminUserRow)
      : ({ ...(user as Omit<AdminUserRow, "isBlocked">), isBlocked: false } as AdminUserRow);

    return NextResponse.json({ user: normalizedUser }, { status: 201 });
  } catch (e) {
    if (e instanceof UnauthorizedError || e instanceof ForbiddenError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error("Create user error:", e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
