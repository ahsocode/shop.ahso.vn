// app/api/quote-requests/route.ts
import { randomUUID } from "crypto";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonOk, jsonError, toHttpError } from "@/lib/http";
import { QuoteRequestCreateSchema } from "@/app/api/admin/quote-requests/utils";
import { quote_status, contact_priority } from "@prisma/client";
import { EMAIL_CONFIG } from "@/lib/email-config";
import { sendMail } from "@/lib/mailer";

const generatePublicQuoteCode = () => {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const rand = Math.floor(Math.random() * 9000) + 1000;
  return `QR-${yyyy}${mm}${dd}-${rand}`;
};

export async function POST(req: NextRequest) {
  try {
    const raw = await req.json();
    const parsed = QuoteRequestCreateSchema.pick({
      fullName: true,
      phone: true,
      email: true,
      company: true,
      productId: true,
      productName: true,
      quantity: true,
      message: true,
    }).safeParse(raw);

    if (!parsed.success) {
      return jsonError("Thông tin chưa hợp lệ", 400, { issues: parsed.error.issues });
    }

    const payload = parsed.data;
    const code = generatePublicQuoteCode();

    const created = await prisma.quoterequest.create({
      data: {
        id: randomUUID(),
        code,
        fullName: payload.fullName,
        phone: payload.phone,
        email: payload.email ?? null,
        company: payload.company ?? null,
        productId: payload.productId ?? null,
        productName: payload.productName ?? null,
        quantity: payload.quantity ?? 1,
        message: payload.message ?? null,
        status: quote_status.pending,
        priority: contact_priority.normal,
      },
      select: { id: true, code: true },
    });

    // Fire-and-forget notifications
    const adminEmail = EMAIL_CONFIG.ADMIN_EMAIL;
    const adminText = `
YÊU CẦU BÁO GIÁ MỚI

Mã: ${created.code}
Khách hàng: ${payload.fullName}
Điện thoại: ${payload.phone}
${payload.email ? `Email: ${payload.email}` : ""}
Sản phẩm: ${payload.productName ?? payload.productId ?? "Chưa rõ"}

${payload.message ? `Ghi chú: ${payload.message}` : ""}
`;

    const userText = `
Xin chào ${payload.fullName},

Chúng tôi đã nhận được yêu cầu báo giá của bạn${payload.productName ? ` cho sản phẩm ${payload.productName}` : ""}.
Mã yêu cầu: ${created.code}

Chúng tôi sẽ liên hệ sớm qua số ${payload.phone}${payload.email ? ` hoặc email ${payload.email}` : ""}.

Trân trọng,
AHSO Industrial
`;

    const mailJobs: Promise<unknown>[] = [];
    if (adminEmail) {
      mailJobs.push(
        sendMail({
          to: adminEmail,
          subject: `🔔 Yêu cầu báo giá mới ${created.code}`,
          text: adminText,
        }).catch((err) => console.error("Send admin quote email failed", err)),
      );
    }
    if (payload.email) {
      mailJobs.push(
        sendMail({
          to: payload.email,
          subject: `Đã nhận yêu cầu báo giá ${created.code}`,
          text: userText,
        }).catch((err) => console.error("Send user quote email failed", err)),
      );
    }
    void Promise.all(mailJobs);

    return jsonOk({ success: true, data: { code: created.code } }, 201);
  } catch (error) {
    const err = toHttpError(error);
    return jsonError(err.message || "Internal Error", err.status || 500);
  }
}
