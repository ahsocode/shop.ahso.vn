// app/api/contacts/route.ts
import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sendMail } from "@/lib/mailer";
import { EMAIL_CONFIG } from "@/lib/email-config";
import type { contact_status } from "@prisma/client";
import { getContactNotificationEmail } from "@/lib/system-settings";

const RATE_LIMIT = {
  MAX_PENDING: 3, // Tối đa 3 yêu cầu chưa xử lý/số
  // Các status được tính vào rate limit
  STATUSES_COUNTED: ["new", "in_progress"] as contact_status[],
};

const ContactCreateSchema = z.object({
  fullName: z.string().min(1, "Họ tên là bắt buộc").max(128),
  phone: z.string().min(9, "Số điện thoại không hợp lệ").max(20),
  email: z.string().email().optional(),
  company: z.string().max(191).optional(),
  subject: z.string().max(500).optional(),
  message: z.string().min(10, "Nội dung quá ngắn").max(5000),
  typeId: z.string().optional(),
});

/**
 * Tạo mã liên hệ duy nhất: CT-YYYYMMDD-XXXX
 */
async function generateContactCode(): Promise<string> {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");

  for (let attempt = 0; attempt < 5; attempt++) {
    const random = Math.floor(1000 + Math.random() * 9000);
    const code = `CT-${dateStr}-${random}`;

    const exists = await prisma.contact.findUnique({
      where: { code },
      select: { id: true },
    });

    if (!exists) return code;
  }

  // Fallback: timestamp-based
  return `CT-${dateStr}-${Date.now().toString().slice(-4)}`;
}

/**
 * Kiểm tra rate limit theo số điện thoại
 */
async function checkRateLimit(phone: string): Promise<{
  allowed: boolean;
  currentCount: number;
  limit: number;
}> {
  const count = await prisma.contact.count({
    where: {
      phone,
      status: { in: RATE_LIMIT.STATUSES_COUNTED },
    },
  });

  return {
    allowed: count < RATE_LIMIT.MAX_PENDING,
    currentCount: count,
    limit: RATE_LIMIT.MAX_PENDING,
  };
}

/**
 * Gửi email xác nhận cho khách hàng
 */
async function sendCustomerConfirmation(data: {
  email: string;
  fullName: string;
  code: string;
}) {
  const subject = `Xác nhận yêu cầu liên hệ ${data.code} - AHSO Industrial`;

  const text = `
Xin chào ${data.fullName},

Cảm ơn bạn đã liên hệ với AHSO Industrial!

Mã yêu cầu của bạn: ${data.code}

Chúng tôi đã nhận được yêu cầu và sẽ liên hệ lại với bạn trong thời gian sớm nhất.

Nếu có bất kỳ thắc mắc nào, vui lòng trả lời email này hoặc gọi hotline: 0901 951 351

Trân trọng,
AHSO Industrial
  `.trim();

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; }
    .code-box { background: #dbeafe; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✅ Đã nhận yêu cầu liên hệ!</h1>
    </div>
    <div class="content">
      <p>Xin chào <strong>${data.fullName}</strong>,</p>
      
      <p>Cảm ơn bạn đã liên hệ với AHSO Industrial!</p>
      
      <div class="code-box">
        <p style="margin: 0; font-size: 14px; color: #6b7280;">Mã yêu cầu của bạn</p>
        <p style="margin: 10px 0 0; font-size: 24px; font-weight: bold; color: #1e40af;">${data.code}</p>
      </div>

      <p>Chúng tôi đã nhận được yêu cầu và sẽ liên hệ lại với bạn trong thời gian sớm nhất.</p>
      
      <p style="margin-top: 30px;">
        Nếu có bất kỳ thắc mắc nào, vui lòng:<br>
        📧 Trả lời email này<br>
        📞 Gọi hotline: <strong>0901 951 351</strong>
      </p>
    </div>
    <div class="footer">
      <p>Trân trọng,<br><strong>AHSO Industrial</strong></p>
    </div>
  </div>
</body>
</html>
  `;

  await sendMail({ to: data.email, subject, text, html });
}

/**
 * Gửi email thông báo cho admin
 */
async function sendAdminNotification(data: {
  code: string;
  fullName: string;
  phone: string;
  email?: string;
  company?: string;
  subject?: string;
  message: string;
  adminEmail?: string;
}) {
  const adminEmail = data.adminEmail || EMAIL_CONFIG.ADMIN_EMAIL;
  const subject = `🔔 Yêu cầu liên hệ mới ${data.code}`;

  const text = `
YÊU CẦU LIÊN HỆ MỚI

Mã: ${data.code}
Họ tên: ${data.fullName}
Số điện thoại: ${data.phone}
${data.email ? `Email: ${data.email}` : ""}
${data.company ? `Công ty: ${data.company}` : ""}
${data.subject ? `Chủ đề: ${data.subject}` : ""}

Nội dung:
${data.message}

---
Vui lòng xử lý yêu cầu này sớm nhất.
Link quản lý: ${process.env.NEXT_PUBLIC_SITE_URL}/admin/contacts
  `.trim();

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #dc2626; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #ffffff; padding: 20px; border: 2px solid #dc2626; }
    .info { background: #fef2f2; padding: 15px; border-radius: 8px; margin: 15px 0; }
    .btn { display: inline-block; background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>🔔 YÊU CẦU LIÊN HỆ MỚI</h2>
    </div>
    <div class="content">
      <div class="info">
        <p><strong>Mã:</strong> ${data.code}</p>
        <p><strong>Họ tên:</strong> ${data.fullName}</p>
        <p><strong>Số điện thoại:</strong> ${data.phone}</p>
        ${data.email ? `<p><strong>Email:</strong> ${data.email}</p>` : ""}
        ${data.company ? `<p><strong>Công ty:</strong> ${data.company}</p>` : ""}
        ${data.subject ? `<p><strong>Chủ đề:</strong> ${data.subject}</p>` : ""}
      </div>

      <h3>📝 Nội dung yêu cầu:</h3>
      <p style="background: #f9fafb; padding: 15px; border-radius: 8px; white-space: pre-wrap;">${data.message}</p>

      <div style="text-align: center;">
        <a href="${process.env.NEXT_PUBLIC_SITE_URL}/admin/contacts" class="btn">Xem chi tiết & Xử lý</a>
      </div>
    </div>
  </div>
</body>
</html>
  `;

  await sendMail({ to: adminEmail, subject, text, html });
}

/**
 * POST /api/contacts - Tạo yêu cầu liên hệ mới
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = ContactCreateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "VALIDATION_ERROR",
          issues: parsed.error.issues,
        },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // ✅ Kiểm tra rate limit
    const rateLimitCheck = await checkRateLimit(data.phone);
    if (!rateLimitCheck.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: "RATE_LIMIT_EXCEEDED",
          message: `Số điện thoại này đã có ${rateLimitCheck.currentCount} yêu cầu chưa xử lý. Vui lòng đợi xử lý hoặc liên hệ trực tiếp qua hotline.`,
          currentCount: rateLimitCheck.currentCount,
          limit: rateLimitCheck.limit,
        },
        { status: 429 }
      );
    }

    // ✅ Tạo mã liên hệ
    const code = await generateContactCode();

    // ✅ Lấy IP & User Agent
    const ipAddress =
      req.headers.get("x-forwarded-for") ||
      req.headers.get("x-real-ip") ||
      "unknown";
    const userAgent = req.headers.get("user-agent") || null;
    const referrer = req.headers.get("referer") || null;

    // ✅ Tạo contact trong DB
    const contact = await prisma.contact.create({
      data: {
        id: randomUUID(),
        code,
        fullName: data.fullName,
        phone: data.phone,
        email: data.email || null,
        company: data.company || null,
        subject: data.subject || null,
        message: data.message,
        typeId: data.typeId || null,
        source: "website",
        status: "new",
        priority: "normal",
        ipAddress,
        userAgent,
        referrer,
      },
      select: {
        id: true,
        code: true,
        fullName: true,
        phone: true,
        email: true,
        createdAt: true,
      },
    });

    // ✅ Gửi email (không chặn response)
    const emailPromises: Promise<unknown>[] = [];

    if (contact.email) {
      emailPromises.push(
        sendCustomerConfirmation({
          email: contact.email,
          fullName: contact.fullName,
          code: contact.code,
        }).catch((err) => console.error("Failed to send customer email:", err))
      );
    }

    const adminEmail = await getContactNotificationEmail();

    emailPromises.push(
      sendAdminNotification({
        code: contact.code,
        fullName: contact.fullName,
        phone: contact.phone,
        email: contact.email || undefined,
        company: data.company || undefined,
        subject: data.subject || undefined,
        message: data.message,
        adminEmail,
      }).catch((err) => console.error("Failed to send admin email:", err))
    );

    // Fire and forget
    void Promise.all(emailPromises);

    return NextResponse.json(
      {
        success: true,
        data: {
          id: contact.id,
          code: contact.code,
          message: "Yêu cầu của bạn đã được gửi thành công!",
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Contact creation error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "INTERNAL_ERROR",
        message: "Đã có lỗi xảy ra. Vui lòng thử lại sau.",
      },
      { status: 500 }
    );
  }
}
