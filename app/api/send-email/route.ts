import { NextRequest, NextResponse } from "next/server";
import { sendMail } from "@/lib/mailer";

export const runtime = "nodejs"; // BẮT BUỘC cho Nodemailer

export async function POST(req: NextRequest) {
  try {
    const { to, subject, message, attachments } = await req.json();

    if (!to || !subject || !message) {
      return NextResponse.json({ ok: false, error: "Thiếu to/subject/message" }, { status: 400 });
    }

    const info = await sendMail({
      to,                       // ← ĐIỀN: người nhận (string hoặc string[])
      subject,                  // ← ĐIỀN: tiêu đề
      html: `<div style="font-family:Segoe UI,Arial"><p>${message}</p></div>`, // ← hoặc tạo HTML riêng
      text: message,            // ← fallback text
      attachments,              // ← (tuỳ chọn) [{ filename, path }]...
    });

    return NextResponse.json({ ok: true, messageId: info.messageId });
  } catch (err: any) {
    console.error("Send mail error:", err);
    return NextResponse.json({ ok: false, error: err?.message || "Send mail failed" }, { status: 500 });
  }
}
