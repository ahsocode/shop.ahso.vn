// app/api/auth/reset-password/route.ts
import { NextResponse } from "next/server"
import { z } from "zod"
import { jwtVerify, type JWTPayload } from "jose"
import bcrypt from "bcrypt"
import { prisma } from "@/lib/prisma"
import { sendMail } from "@/lib/mailer"

function getBaseUrl(req: Request) {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL
  if (envUrl) return envUrl.replace(/\/$/, "")
  const url = new URL(req.url)
  return `${url.protocol}//${url.host}`
}

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
    type ResetPayload = JWTPayload & { type?: string }
    let payload: ResetPayload
    try {
      const result = await jwtVerify<ResetPayload>(token, new TextEncoder().encode(secret))
      payload = result.payload
    } catch {
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
      select: { id: true, email: true, fullName: true },
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

    // Notify user via email
    if (user.email) {
      const now = new Intl.DateTimeFormat("vi-VN", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date())
      const baseUrl = getBaseUrl(req)

      const emailPayload = {
        to: user.email,
        subject: "Mật khẩu của bạn đã được đổi",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
            <h2 style="color: #1a56db;">Xin chào ${user.fullName || "bạn"},</h2>
            <p>Mật khẩu của bạn trên AHSO đã được thay đổi thành công lúc <strong>${now}</strong>.</p>
            <p>Nếu không phải bạn thực hiện, vui lòng <strong>đặt lại mật khẩu</strong> ngay và liên hệ hỗ trợ.</p>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="color: #666; font-size: 12px;">
              AHSO Industrial - <a href="${baseUrl}">${baseUrl}</a>
            </p>
          </div>
        `,
      }

      await sendMail(emailPayload)
    }

    return NextResponse.json({
      message: "Đặt lại mật khẩu thành công",
    })

  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal Server Error"
    console.error("RESET PASSWORD ERROR:", error)
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}
