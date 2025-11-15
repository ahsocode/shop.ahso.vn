// app/api/auth/forgot-password/route.ts
import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { SignJWT } from "jose"
import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

const forgotPasswordSchema = z.object({
  email: z.string().email("Email không hợp lệ"),
})

async function generateResetToken(userId: string): Promise<string> {
  const secret = process.env.JWT_SECRET
  if (!secret) throw new Error("Missing JWT_SECRET")
  
  const encoder = new TextEncoder()
  const now = Math.floor(Date.now() / 1000)
  const exp = now + (15 * 60) // 15 phút
  
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

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, email: true, fullName: true },
    })

    if (user) {
      const resetToken = await generateResetToken(user.id)
      const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${resetToken}`

      // GỬI EMAIL BẰNG RESEND
      await resend.emails.send({
        from: "AHSO Shop <no-reply@shop.ahso.vn>", // Bạn sẽ verify domain sau
        to: user.email,
        subject: "Đặt lại mật khẩu - AHSO",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
            <h2 style="color: #1a56db;">Xin chào ${user.fullName || 'bạn'},</h2>
            <p>Bạn vừa yêu cầu <strong>đặt lại mật khẩu</strong> cho tài khoản AHSO.</p>
            <p>Nhấn vào nút dưới đây để tiếp tục:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" 
                 style="background: #1a56db; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                Đặt lại mật khẩu
              </a>
            </div>
            <p><small>Link này sẽ <strong>hết hạn sau 15 phút</strong>.</small></p>
            <p>Nếu bạn không yêu cầu, bỏ qua email này.</p>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="color: #666; font-size: 12px;">
              AHSO Shop - <a href="https://shop.ahso.vn">shop.ahso.vn</a>
            </p>
          </div>
        `,
      })

      console.log("Email reset đã gửi qua Resend đến:", user.email)
    }

    return NextResponse.json({
      message: "Nếu email tồn tại, link đặt lại mật khẩu đã được gửi",
    })

  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal Server Error"
    console.error("FORGOT PASSWORD ERROR:", error)
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}
