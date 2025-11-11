// app/api/auth/register/route.ts
import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { SignJWT } from "jose";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

// ===== Validation =====
const addressSchema = z.object({
  line1: z.string().min(1, "line1 bắt buộc"),
  line2: z.string().optional(),
  city: z.string().min(1, "city bắt buộc"),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().length(2, "country là mã ISO-3166 2 chữ"),
});

const registerSchema = z.object({
  username: z
    .string()
    .min(3)
    .max(32)
    .regex(/^[a-z0-9_.-]+$/, "username chỉ gồm a-z 0-9 _ . -"),
  password: z
    .string()
    .min(8, "Mật khẩu ≥ 8 ký tự")
    .refine(
      (v) => /[a-z]/.test(v) && /[A-Z]/.test(v) && /\d/.test(v),
      "Mật khẩu cần có chữ hoa, thường và số"
    ),
  fullName: z.string().min(1).max(128),
  shippingAddress: addressSchema,
  billingAddress: addressSchema.optional(),
  taxCode: z
    .string()
    .regex(/^\d{10}(\d{3})?$/)
    .optional(),
  phone: z.string().min(9).max(20),
  email: z.string().email(),
});

// ===== Helpers =====
const PHONE_VN_REGEX = /^(?:\+?84|0)(\d{9})$/;

function toE164VN(input: string): string {
  const s = input.replace(/\s|-/g, "");
  const m = s.match(PHONE_VN_REGEX);
  if (!m) return s.startsWith("+") ? s : s;
  return `+84${m[1]}`;
}

function normCountry2(s: string) {
  return s.toUpperCase();
}

function addressesEqual(
  a: z.infer<typeof addressSchema>,
  b: z.infer<typeof addressSchema>
) {
  return (
    a.line1 === b.line1 &&
    (a.line2 ?? "") === (b.line2 ?? "") &&
    a.city === b.city &&
    (a.state ?? "") === (b.state ?? "") &&
    (a.postalCode ?? "") === (b.postalCode ?? "") &&
    normCountry2(a.country) === normCountry2(b.country)
  );
}

function parseExpiry(s: string): number {
  const m = s.match(/^(\d+)([smhd])$/);
  if (!m) return 7 * 24 * 3600;
  const n = parseInt(m[1], 10);
  return m[2] === "s" ? n : m[2] === "m" ? n * 60 : m[2] === "h" ? n * 3600 : n * 86400;
}

async function signJwt(payload: object, expiresIn = "7d") {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("Missing JWT_SECRET");
  const encoder = new TextEncoder();
  const now = Math.floor(Date.now() / 1000);
  const exp = now + parseExpiry(expiresIn);
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt(now)
    .setExpirationTime(exp)
    .sign(encoder.encode(secret));
}

/**
 * ⭐ Merge guest cart vào user mới tạo
 */
async function mergeGuestCartToNewUser(guestCartId: string, userId: string) {
  try {
    const guestCart = await prisma.cart.findUnique({
      where: { id: guestCartId },
      include: { items: true },
    });

    if (!guestCart || guestCart.userId) {
      return;
    }

    // Gán cart này cho user mới
    await prisma.cart.update({
      where: { id: guestCartId },
      data: { userId },
    });

    console.log(`✅ Assigned guest cart ${guestCartId} to new user ${userId}`);
  } catch (error) {
    console.error("❌ Error merging guest cart to new user:", error);
  }
}

// ===== Route =====
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = registerSchema.safeParse(body);
    
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
    const shipping = {
      ...data.shippingAddress,
      country: normCountry2(data.shippingAddress.country),
    };
    const billingInput = data.billingAddress
      ? { ...data.billingAddress, country: normCountry2(data.billingAddress.country) }
      : undefined;

    // Check conflict
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
          role: "USER",
        },
        select: {
          id: true,
          username: true,
          fullName: true,
          email: true,
          phoneE164: true,
          taxCode: true,
          shippingAddressId: true,
          billingAddressId: true,
          createdAt: true,
          role: true,
          avatarUrl: true,
        },
      });
    });

    // ⭐ Merge guest cart nếu có
    const guestCartId = req.headers.get("cookie")?.match(/cart_id=([^;]+)/)?.[1];
    if (guestCartId) {
      await mergeGuestCartToNewUser(decodeURIComponent(guestCartId), user.id);
    }

    const token = await signJwt(
      { sub: user.id, username: user.username, email: user.email, role: user.role },
      "7d"
    );

    const res = NextResponse.json(
      { user, token, tokenType: "Bearer", expiresIn: 7 * 24 * 3600 },
      { status: 201 }
    );

    // Set auth cookie
    res.cookies.set("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
    });

    // ⭐ Clear guest cart cookie
    res.cookies.delete("cart_id");

    return res;
  } catch (err: any) {
    console.error("REGISTER ERROR:", err);
    if (err?.code === "P2002") {
      return NextResponse.json({ error: "CONFLICT", meta: err.meta }, { status: 409 });
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}