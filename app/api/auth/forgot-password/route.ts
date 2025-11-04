// app/api/auth/forgot-password/route.ts
import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { SignJWT } from "jose"

const forgotPasswordSchema = z.object({
  email: z.string().email("Email không hợp lệ"),
})

async function generateResetToken(userId: string): Promise<string> {
  const secret = process.env.JWT_SECRET
  if (!secret) throw new Error("Missing JWT_SECRET")
  
  const encoder = new TextEncoder()
  const now = Math.floor(Date.now() / 1000)
  const exp = now + (15 * 60) // 15 minutes
  
  return new SignJWT({ sub: userId, type: "password-reset" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt(now)
    .setExpirationTime(exp)
    .sign(encoder.encode(secret))
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const parsed = forgotPasswordSchema.safeParse(body)
    
    if (!parsed.success) {
      return NextResponse.json(
        { error: "VALIDATION_ERROR", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { email } = parsed.data
    const normalizedEmail = email.toLowerCase()

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, email: true, fullName: true },
    })

    // Always return success to prevent email enumeration
    // But only send email if user exists
    if (user) {
      const resetToken = await generateResetToken(user.id)
      const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/reset-password?token=${resetToken}`

      // TODO: Send email with reset link
      // For now, just log it (in production, use a proper email service)
      console.log("=".repeat(80))
      console.log("PASSWORD RESET REQUEST")
      console.log("=".repeat(80))
      console.log(`User: ${user.fullName} (${user.email})`)
      console.log(`Reset URL: ${resetUrl}`)
      console.log(`Token expires in: 15 minutes`)
      console.log("=".repeat(80))

      // In production, you would send an email here:
      /*
      await sendEmail({
        to: user.email,
        subject: "Đặt lại mật khẩu - AHSO",
        html: `
          <h2>Xin chào ${user.fullName},</h2>
          <p>Bạn đã yêu cầu đặt lại mật khẩu.</p>
          <p>Nhấn vào link dưới đây để đặt lại mật khẩu:</p>
          <a href="${resetUrl}">Đặt lại mật khẩu</a>
          <p>Link này có hiệu lực trong 15 phút.</p>
          <p>Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.</p>
        `,
      })
      */
    }

    // Always return success to prevent email enumeration
    return NextResponse.json({
      message: "Nếu email tồn tại, link đặt lại mật khẩu đã được gửi",
    })

  } catch (err) {
    console.error("FORGOT PASSWORD ERROR:", err)
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    )
  }
}

