// app/api/auth/login/route.ts
import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { SignJWT } from "jose";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const loginSchema = z.object({
  identifier: z.string().optional(), // Support cả username/email/phone
  username: z.string().optional(),
  email: z.string().optional(),
  password: z.string().min(1, "Password required"),
}).refine((data) => data.identifier || data.username || data.email, {
  message: "Username, email, or identifier is required",
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

/**
 * Merge guest cart vào user cart khi login
 */
async function mergeGuestCartToUser(guestCartId: string, userId: string) {
  try {
    const guestCart = await prisma.cart.findUnique({
      where: { id: guestCartId },
      include: { items: true },
    });

    // Không merge nếu cart không tồn tại hoặc đã thuộc user khác
    if (!guestCart || guestCart.userId) {
      return;
    }

    // Tìm hoặc tạo user cart
    let userCart = await prisma.cart.findFirst({
      where: { userId, status: "ACTIVE" },
      include: { items: true },
    });

    if (!userCart) {
      userCart = await prisma.cart.create({
        data: { userId, status: "ACTIVE" },
        include: { items: true },
      });
    }

    // Merge items
    for (const guestItem of guestCart.items) {
      const existingUserItem = userCart.items.find(
        (ui) => ui.productId === guestItem.productId
      );

      if (existingUserItem) {
        // Cộng dồn số lượng
        const newQty = existingUserItem.quantity + guestItem.quantity;
        await prisma.cartItem.update({
          where: { id: existingUserItem.id },
          data: {
            quantity: newQty,
            lineTotal: Number(existingUserItem.unitPrice) * newQty,
          },
        });
      } else {
        // Tạo item mới
        await prisma.cartItem.create({
          data: {
            cartId: userCart.id,
            productId: guestItem.productId,
            productName: guestItem.productName,
            productSku: guestItem.productSku,
            productSlug: guestItem.productSlug,
            productImage: guestItem.productImage,
            brandName: guestItem.brandName,
            unitLabel: guestItem.unitLabel,
            quantityLabel: guestItem.quantityLabel,
            unitPrice: guestItem.unitPrice,
            currency: guestItem.currency,
            taxIncluded: guestItem.taxIncluded,
            quantity: guestItem.quantity,
            lineTotal: guestItem.lineTotal,
          },
        });
      }
    }

    // Tính lại tổng
    const updatedItems = await prisma.cartItem.findMany({
      where: { cartId: userCart.id },
    });
    const subtotal = updatedItems.reduce((s, it) => s + Number(it.lineTotal || 0), 0);

    await prisma.cart.update({
      where: { id: userCart.id },
      data: {
        subtotal,
        grandTotal: subtotal,
      },
    });

    // Xóa guest cart
    await prisma.cart.delete({ where: { id: guestCartId } });

    console.log(`✅ Merged guest cart ${guestCartId} to user ${userId}`);
  } catch (error) {
    console.error("❌ Error merging cart:", error);
    // Không throw error để không làm fail login
  }
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
    
    // Xác định where clause
    let where: Prisma.UserWhereInput;
    if (data.identifier) {
      const id = data.identifier.toLowerCase();
      where = {
        OR: [
          { username: id },
          { email: id },
          { phoneE164: id.startsWith("+") ? id : `+84${id.replace(/^0/, "")}` },
        ],
      };
    } else if (data.username) {
      where = { username: data.username.toLowerCase() };
    } else {
      where = { email: data.email!.toLowerCase() };
    }

    const user = await prisma.user.findFirst({ where });
    
    if (!user) {
      return NextResponse.json(
        { error: "INVALID_CREDENTIALS" },
        { status: 401 }
      );
    }

    const match = await bcrypt.compare(data.password, user.passwordHash);
    
    if (!match) {
      return NextResponse.json(
        { error: "INVALID_CREDENTIALS" },
        { status: 401 }
      );
    }

    // ⭐ Merge guest cart nếu có
    const guestCartId = req.headers.get("cookie")?.match(/cart_id=([^;]+)/)?.[1];
    if (guestCartId) {
      await mergeGuestCartToUser(decodeURIComponent(guestCartId), user.id);
    }

    // Tạo JWT token
    const token = await signJwt(
      {
        sub: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
      "7d"
    );

    const res = NextResponse.json({
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
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error("LOGIN ERROR:", error);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
