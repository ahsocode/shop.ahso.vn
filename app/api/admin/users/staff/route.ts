import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma, prismaSupportsUserBlockField } from "../../../../../lib/prisma";
import { verifyBearerAuth, requireRole, UnauthorizedError, ForbiddenError } from "../../../../../lib/auth";

const createStaffSchema = z.object({
  // Chấp nhận hoa/thường, sẽ lưu lowercase
  username: z.string().min(3).max(32).regex(/^[a-zA-Z0-9_.-]+$/),
  password: z.string().min(8),
  fullName: z.string().min(1).max(128),
});

type StaffRow = {
  id: string;
  username: string;
  fullName: string;
  email: string;
  phoneE164: string;
  role: string;
  createdAt: Date;
  isBlocked: boolean;
};

const BASE_STAFF_SELECT = {
  id: true,
  username: true,
  fullName: true,
  email: true,
  phoneE164: true,
  role: true,
  createdAt: true,
} satisfies Prisma.UserSelect;

const staffSelect: Prisma.UserSelect = prismaSupportsUserBlockField
  ? { ...BASE_STAFF_SELECT, isBlocked: true }
  : BASE_STAFF_SELECT;

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
    const page = toInt(searchParams.get("page"), 1);
    const pageSize = toInt(searchParams.get("pageSize"), 20);

    const where: Prisma.UserWhereInput = { role: "STAFF" };
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
        select: staffSelect,
      }),
    ]);

    const rows: StaffRow[] = prismaSupportsUserBlockField
      ? (rawRows as StaffRow[])
      : (rawRows as Omit<StaffRow, "isBlocked">[]).map((row) => ({ ...row, isBlocked: false }));

    return NextResponse.json({ data: rows, meta: { total, page, pageSize, blockable: prismaSupportsUserBlockField } });
  } catch (e) {
    if (e instanceof UnauthorizedError || e instanceof ForbiddenError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const me = await verifyBearerAuth(req);
    requireRole(me, ["ADMIN"]);

    const body = await req.json();
    const parsed = createStaffSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "VALIDATION_ERROR", details: parsed.error.flatten() }, { status: 400 });
    }

    const data = parsed.data;
    const username = data.username.toLowerCase();
    let email = `${username}@example.local`;
    // Tạo số điện thoại E.164 ngẫu nhiên để đảm bảo unique
    async function genUniquePhone(): Promise<string> {
      for (let i = 0; i < 5; i++) {
        const candidate = `+84${Math.floor(100000000 + Math.random() * 900000000)}`; // +84 + 9 digits
        const found = await prisma.user.findUnique({ where: { phoneE164: candidate } });
        if (!found) return candidate;
      }
      return `+84${Date.now().toString().slice(-9)}`;
    }
    const phoneE164 = await genUniquePhone();

    const existed = await prisma.user.findFirst({ where: { OR: [{ username }, { email }] }, select: { id: true } });
    if (existed) email = `${username}+${Date.now()}@example.local`;

    const passwordHash = await bcrypt.hash(data.password, 12);

    const user = await prisma.$transaction(async (tx) => {
      const addr = await tx.address.create({ data: { line1: "Auto Staff", city: "HCM", country: "VN" } });
      const created = await tx.user.create({
        data: {
          username,
          passwordHash,
          fullName: data.fullName,
          email,
          phoneE164,
          shippingAddressId: addr.id,
          billingAddressId: addr.id,
          role: "STAFF",
        },
        select: staffSelect,
      });
      return created;
    });

    const normalized: StaffRow = prismaSupportsUserBlockField
      ? (user as StaffRow)
      : ({ ...(user as Omit<StaffRow, "isBlocked">), isBlocked: false } as StaffRow);

    return NextResponse.json({ user: normalized }, { status: 201 });
  } catch (e) {
    if (e instanceof UnauthorizedError || e instanceof ForbiddenError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
