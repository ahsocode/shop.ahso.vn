// app/api/auth/register/route.ts
import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { SignJWT } from "jose";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import type { Prisma } from "@prisma/client";
import { shouldUseSecureAuthCookie } from "@/lib/auth";
import { sendMail } from "@/lib/mailer";

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

    const user = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const now = new Date();
      const shipAddr = await tx.address.create({
        data: {
          id: randomUUID(),
          line1: shipping.line1,
          line2: shipping.line2 ?? null,
          city: shipping.city,
          state: shipping.state ?? null,
          postalCode: shipping.postalCode ?? null,
          country: shipping.country,
          updatedAt: now,
        },
      });

      let billingAddrId = shipAddr.id;
      if (billingInput && !addressesEqual(shipping, billingInput)) {
        const billAddr = await tx.address.create({
          data: {
            id: randomUUID(),
            line1: billingInput.line1,
            line2: billingInput.line2 ?? null,
            city: billingInput.city,
            state: billingInput.state ?? null,
            postalCode: billingInput.postalCode ?? null,
            country: billingInput.country,
            updatedAt: now,
          },
        });
        billingAddrId = billAddr.id;
      }

      return tx.user.create({
        data: {
          id: randomUUID(),
          username,
          passwordHash,
          fullName: data.fullName,
          email,
          phoneE164,
          taxCode: data.taxCode ?? null,
          shippingAddressId: shipAddr.id,
          billingAddressId: billingAddrId,
          role: "USER",
          updatedAt: now,
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

    const token = await signJwt(
      { sub: user.id, username: user.username, email: user.email, role: user.role },
      "7d"
    );

    // Gửi email chào mừng qua SMTP (không chặn luồng nếu lỗi)
    if (user.email) {
      const emailPayload = {
        to: user.email,
        subject: "Chào mừng bạn đến AHSO",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
            <h2 style="color: #1a56db; margin-bottom: 12px;">Chào mừng ${user.fullName || user.username || "bạn"}!</h2>
            <p>Cảm ơn bạn đã quan tâm đến <strong>AHSO Industrial</strong>. Chúng tôi rất hân hạnh được hỗ trợ bạn.</p>
            <p>Bạn có thể đăng nhập để quản lý hồ sơ và gửi yêu cầu:</p>
            <div style="text-align: center; margin: 24px 0;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL ?? "/"}"
                 style="background: #1a56db; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                Đăng nhập ngay
              </a>
            </div>
            <p style="color: #555;">Nếu bạn không tự đăng ký tài khoản, vui lòng liên hệ với chúng tôi để được hỗ trợ.</p>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 24px 0;">
            <p style="color: #666; font-size: 12px;">AHSO Industrial</p>
          </div>
        `,
      };

      try {
        await sendMail(emailPayload);
      } catch (err) {
        console.error("❌ Failed to send welcome email:", err);
      }
    }

    const res = NextResponse.json(
      { user, token, tokenType: "Bearer", expiresIn: 7 * 24 * 3600 },
      { status: 201 }
    );

    // Set auth cookie
    const secureCookie = shouldUseSecureAuthCookie();
    res.cookies.set("auth_token", token, {
      httpOnly: true,
      secure: secureCookie,
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
    });

    return res;
  } catch (error) {
    console.error("REGISTER ERROR:", error);
    if (error instanceof PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "CONFLICT", meta: error.meta }, { status: 409 });
    }
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
