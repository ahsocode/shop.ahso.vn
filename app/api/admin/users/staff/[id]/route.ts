import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma, prismaSupportsUserBlockField } from "../../../../../../lib/prisma";
import { verifyBearerAuth, requireRole, UnauthorizedError, ForbiddenError } from "../../../../../../lib/auth";

const updateSchema = z.object({
  fullName: z.string().min(1).max(128).optional(),
  email: z.string().email().optional(),
  phone: z.string().min(9).max(20).optional(),
  password: z.string().min(8).optional(),
  isBlocked: z.boolean().optional(),
});

type StaffDetailRow = {
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

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const record = await prisma.user.findUnique({
      where: { id, role: "STAFF" },
      select: staffSelect,
    });
    const user: StaffDetailRow | null = record
      ? (prismaSupportsUserBlockField
          ? (record as StaffDetailRow)
          : ({ ...(record as Omit<StaffDetailRow, "isBlocked">), isBlocked: false } as StaffDetailRow))
      : null;
    if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ data: user });
  } catch (error) {
    console.error("Fetch staff user error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const me = await verifyBearerAuth(req);
    requireRole(me, ["ADMIN"]);
    const { id } = await params;
    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "VALIDATION_ERROR", details: parsed.error.flatten() }, { status: 400 });

    const data = parsed.data;
    const updates: Prisma.UserUpdateInput = {};
    if (data.fullName) updates.fullName = data.fullName;
    if (data.email) updates.email = data.email.toLowerCase();
    if (data.phone) updates.phoneE164 = data.phone;
    if (data.password) updates.passwordHash = await bcrypt.hash(data.password, 12);
    if (typeof data.isBlocked === "boolean") {
      if (!prismaSupportsUserBlockField) {
        return NextResponse.json(
          { error: "FEATURE_UNAVAILABLE", message: "Cần chạy prisma migrate + generate trước khi sử dụng chức năng khóa/mở khóa." },
          { status: 422 },
        );
      }
      updates.isBlocked = data.isBlocked;
    }

    const updated = await prisma.user.update({
      where: { id },
      data: updates,
      select: staffSelect,
    });
    const normalized: StaffDetailRow = prismaSupportsUserBlockField
      ? (updated as StaffDetailRow)
      : ({ ...(updated as Omit<StaffDetailRow, "isBlocked">), isBlocked: false } as StaffDetailRow);
    return NextResponse.json({ data: normalized });
  } catch (e) {
    if (e instanceof UnauthorizedError || e instanceof ForbiddenError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error("Update staff error:", e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const me = await verifyBearerAuth(req);
    requireRole(me, ["ADMIN"]);
    const { id } = await params;
    await prisma.user.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof UnauthorizedError || e instanceof ForbiddenError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error("Delete staff error:", e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
