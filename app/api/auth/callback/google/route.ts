import { randomUUID, randomBytes } from "crypto";
import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { SignJWT } from "jose";
import { prisma, prismaSupportsUserBlockField } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { shouldUseSecureAuthCookie } from "@/lib/auth";

type GoogleTokenResponse = {
  access_token: string;
  expires_in: number;
  scope: string;
  token_type: string;
  id_token?: string;
};

type GoogleUserInfo = {
  sub: string;
  name?: string;
  email?: string;
  email_verified?: boolean;
  picture?: string;
};

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

async function fetchGoogleTokens(code: string, redirectUri: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET");
  }

  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  });

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Token exchange failed (${res.status}): ${errText}`);
  }

  return (await res.json()) as GoogleTokenResponse;
}

async function fetchGoogleUser(accessToken: string): Promise<GoogleUserInfo> {
  const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to fetch Google userinfo: ${text}`);
  }
  return (await res.json()) as GoogleUserInfo;
}

function getBaseUrl(req: Request) {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL;
  if (envUrl) return envUrl.replace(/\/$/, "");
  const url = new URL(req.url);
  return `${url.protocol}//${url.host}`;
}

function safeRedirect(input: string | null): string {
  if (!input) return "/";
  try {
    const decoded = Buffer.from(input, "base64url").toString("utf8");
    const parsed = JSON.parse(decoded) as { redirect?: string };
    const r = parsed.redirect || "/";
    return r.startsWith("/") ? r : "/";
  } catch {
    return "/";
  }
}

function buildRedirectWithStatus(base: string, req: Request, status: string) {
  const url = new URL(base, getBaseUrl(req));
  url.searchParams.set("login", status);
  // Trả về path + query để giữ redirect nội bộ
  return url.pathname + url.search + url.hash;
}

function normalizeUsername(email: string): string {
  const base = email.split("@")[0].toLowerCase().replace(/[^a-z0-9._-]/g, "") || "user";
  return base.slice(0, 24);
}

async function ensureUniqueUsername(tx: Prisma.TransactionClient, base: string) {
  let candidate = base;
  let suffix = 1;
  while (true) {
    const existing = await tx.user.findUnique({ where: { username: candidate } });
    if (!existing) return candidate;
    candidate = `${base}-${suffix++}`.slice(0, 30);
  }
}

function randomPhone(): string {
  const random = Math.floor(Math.random() * 1_000_000_000)
    .toString()
    .padStart(9, "0");
  return `+840${random}`;
}

async function upsertUserFromGoogle(info: GoogleUserInfo, tx: Prisma.TransactionClient) {
  if (!info.email) throw new Error("Google account is missing email");
  const email = info.email.toLowerCase();

  const existing = await tx.user.findUnique({ where: { email } });
  if (existing) {
    if (prismaSupportsUserBlockField && existing.isBlocked) {
      throw new Error("ACCOUNT_BLOCKED");
    }
    return existing;
  }

  // Create minimal addresses to satisfy schema
  const now = new Date();
  const shippingAddressId = randomUUID();
  const billingAddressId = randomUUID();

  await tx.address.create({
    data: {
      id: shippingAddressId,
      line1: "Cập nhật sau",
      city: "Hồ Chí Minh",
      country: "VN",
      updatedAt: now,
    },
  });

  await tx.address.create({
    data: {
      id: billingAddressId,
      line1: "Cập nhật sau",
      city: "Hồ Chí Minh",
      country: "VN",
      updatedAt: now,
    },
  });

  const usernameBase = normalizeUsername(email);
  const username = await ensureUniqueUsername(tx, usernameBase);
  const passwordHash = await bcrypt.hash(randomBytes(24).toString("hex"), 12);
  let phoneE164 = randomPhone();
  while (await tx.user.findUnique({ where: { phoneE164 } })) {
    phoneE164 = randomPhone();
  }

  const user = await tx.user.create({
    data: {
      id: randomUUID(),
      username,
      passwordHash,
      fullName: info.name || username,
      email,
      phoneE164,
      taxCode: null,
      shippingAddressId,
      billingAddressId,
      role: "USER",
      updatedAt: now,
      emailVerified: Boolean(info.email_verified),
      avatarUrl: info.picture ?? "/logo.png",
    },
  });

  return user;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const redirect = safeRedirect(state);
  const failureRedirect = buildRedirectWithStatus(redirect, req, "google_failed");

  try {
    if (!code) {
      return NextResponse.redirect(failureRedirect);
    }

    const redirectUri = `${getBaseUrl(req)}/api/auth/callback/google`;
    const tokens = await fetchGoogleTokens(code, redirectUri);
    const profile = await fetchGoogleUser(tokens.access_token);

    if (!profile.email) {
      return NextResponse.redirect(failureRedirect);
    }

    const user = await prisma.$transaction(async (tx) => {
      return upsertUserFromGoogle(profile, tx);
    });

    const token = await signJwt(
      { sub: user.id, username: user.username, email: user.email, role: user.role },
      "7d",
    );
    const successRedirect = buildRedirectWithStatus(redirect, req, "google_success");

    const res = new NextResponse(
      `<html><body><script>
          try {
            localStorage.setItem('token', ${JSON.stringify(token)});
          } catch (e) {}
          window.location.replace(${JSON.stringify(successRedirect)});
        </script></body></html>`,
      {
        status: 200,
        headers: { "Content-Type": "text/html" },
      },
    );

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
    console.error("Google OAuth callback error:", error);
    return NextResponse.redirect(failureRedirect);
  }
}

