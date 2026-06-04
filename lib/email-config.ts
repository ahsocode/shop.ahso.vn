// lib/email-config.ts
const DEFAULT_FROM_NAME = "AHSO Industrial";
const DEFAULT_FROM_EMAIL = "no-reply@ahso.vn";

const ENV_FROM_EMAIL = process.env.FROM_EMAIL?.trim();
const ENV_FROM_NAME = process.env.EMAIL_FROM_NAME?.trim();
const ENV_ADMIN_EMAIL = process.env.ADMIN_EMAIL?.trim();

const FROM_NAME = ENV_FROM_NAME || DEFAULT_FROM_NAME;
const FROM_EMAIL = ENV_FROM_EMAIL || process.env.SMTP_USER || DEFAULT_FROM_EMAIL;
const ADMIN_EMAIL = ENV_ADMIN_EMAIL || FROM_EMAIL || "admin@ahso.vn";

export const EMAIL_CONFIG = {
  ADMIN_EMAIL,
  FROM_NAME,
  FROM_EMAIL,
} as const;
