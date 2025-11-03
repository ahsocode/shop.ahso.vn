import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { SignJWT } from "jose";
import { prisma } from "../../../../lib/prisma";
import { z } from "zod";

const loginSchema = z.object({
  username: z.string().optional(),
  email: z.string().optional(),
  password: z.string().min(1, "Password required"),
}).refine((data) => data.username || data.email, {
  message: "Username or email is required",
});

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

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "VALIDATION_ERROR", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const where = data.username
      ? { username: data.username.toLowerCase() }
      : { email: data.email!.toLowerCase() };

    const user = await prisma.user.findUnique({ where });
    if (!user) {
      return NextResponse.json({ error: "INVALID_CREDENTIALS" }, { status: 401 });
    }

    const match = await bcrypt.compare(data.password, user.passwordHash);
    if (!match) {
      return NextResponse.json({ error: "INVALID_CREDENTIALS" }, { status: 401 });
    }

    const token = await signJwt(
      { sub: user.id, username: user.username, email: user.email, role: user.role },
      "7d"
    );

    return NextResponse.json({
        tokenType: "Bearer",
        token,
        expiresIn: 7 * 24 * 3600,
        user: {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
            fullName: user.fullName,
            avatarUrl: user.avatarUrl ?? "/logo.png", 
        },
        });

  } catch (err) {
    console.error("LOGIN ERROR:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
