import nodemailer from "nodemailer";

export function getTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST!,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT) === 465, // true nếu 465
    auth: {
      user: process.env.SMTP_USER!,
      pass: process.env.SMTP_PASS!,
    },
  });
}

export async function sendMail({
  to,
  subject,
  html,
  text,
  attachments,
}: {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  attachments?: { filename: string; path?: string; content?: any }[];
}) {
  const transporter = getTransporter();
  const info = await transporter.sendMail({
    from: process.env.FROM_EMAIL || process.env.SMTP_USER, // ← nếu không set FROM_EMAIL sẽ dùng SMTP_USER
    to,
    subject,
    html,
    text,
    attachments,
  });
  return info; // có messageId, response...
}
