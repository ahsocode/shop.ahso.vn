// app/api/auth/reset-password/route.ts
import { NextResponse } from "next/server"
import { z } from "zod"
import { jwtVerify } from "jose"
import bcrypt from "bcrypt"
import { prisma } from "@/lib/prisma"

const resetPasswordSchema = z.object({
  token: z.string().min(1, "Token bắt buộc"),
  password: z.string()
    .min(8, "Mật khẩu ≥ 8 ký tự")
    .refine(v => /[a-z]/.test(v) && /[A-Z]/.test(v) && /\d/.test(v), 
      "Mật khẩu cần có chữ hoa, thường và số"),
})

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const parsed = resetPasswordSchema.safeParse(body)
    
    if (!parsed.success) {
      return NextResponse.json(
        { error: "VALIDATION_ERROR", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { token, password } = parsed.data
    const secret = process.env.JWT_SECRET
    if (!secret) throw new Error("Missing JWT_SECRET")

    // Verify token
    let payload: any
    try {
      const result = await jwtVerify(token, new TextEncoder().encode(secret))
      payload = result.payload
    } catch (err) {
      return NextResponse.json(
        { error: "INVALID_TOKEN", message: "Token không hợp lệ hoặc đã hết hạn" },
        { status: 400 }
      )
    }

    // Check if it's a password reset token
    if (payload.type !== "password-reset") {
      return NextResponse.json(
        { error: "INVALID_TOKEN", message: "Token không hợp lệ" },
        { status: 400 }
      )
    }

    const userId = payload.sub as string

    // Find user
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    })

    if (!user) {
      return NextResponse.json(
        { error: "USER_NOT_FOUND", message: "Người dùng không tồn tại" },
        { status: 404 }
      )
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(password, 12)

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    })

    return NextResponse.json({
      message: "Đặt lại mật khẩu thành công",
    })

  } catch (err) {
    console.error("RESET PASSWORD ERROR:", err)
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    )
  }
}