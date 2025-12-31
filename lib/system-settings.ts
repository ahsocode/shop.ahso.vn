import { prisma } from "@/lib/prisma";
import { EMAIL_CONFIG } from "@/lib/email-config";

export const ORDER_NOTIFICATION_EMAIL_KEY = "orderNotificationEmail";
export const CONTACT_NOTIFICATION_EMAIL_KEY = "contactNotificationEmail";
export const DEFAULT_TAX_RATE_KEY = "defaultTaxRate";

export async function getOrderNotificationEmail(): Promise<string> {
  const setting = await prisma.systemsetting.findUnique({
    where: { key: ORDER_NOTIFICATION_EMAIL_KEY },
  });
  return (
    (setting?.value?.trim() || undefined) ??
    process.env.ADMIN_EMAIL?.trim() ??
    EMAIL_CONFIG.ADMIN_EMAIL
  );
}

export async function getContactNotificationEmail(): Promise<string> {
  // Dùng chung email với đơn hàng để đảm bảo một địa chỉ admin duy nhất
  return getOrderNotificationEmail();
}

export async function updateOrderNotificationEmail(value: string) {
  const normalized = value.trim();
  await prisma.systemsetting.upsert({
    where: { key: ORDER_NOTIFICATION_EMAIL_KEY },
    update: { value: normalized },
    create: {
      key: ORDER_NOTIFICATION_EMAIL_KEY,
      value: normalized,
      description: "Địa chỉ nhận email thông báo đơn hàng mới",
    },
  });
  return normalized;
}

export async function updateContactNotificationEmail(value: string) {
  const normalized = value.trim();
  await prisma.systemsetting.upsert({
    where: { key: CONTACT_NOTIFICATION_EMAIL_KEY },
    update: { value: normalized },
    create: {
      key: CONTACT_NOTIFICATION_EMAIL_KEY,
      value: normalized,
      description: "Địa chỉ nhận email thông báo yêu cầu liên hệ mới",
    },
  });
  return normalized;
}

export async function getDefaultTaxRate(): Promise<number> {
  const setting = await prisma.systemsetting.findUnique({
    where: { key: DEFAULT_TAX_RATE_KEY },
  });
  const value = setting?.value ?? process.env.DEFAULT_TAX_RATE ?? "0.1";
  const rate = Number(value);
  if (Number.isFinite(rate) && rate >= 0 && rate <= 1) return rate;
  const percentRate = rate > 1 && rate <= 100 ? rate / 100 : null;
  return percentRate ?? 0.1;
}

export async function updateDefaultTaxRate(rate: number) {
  const clamped = Math.max(0, Math.min(rate, rate > 1 ? 100 : 1));
  const normalized = clamped > 1 ? (clamped / 100).toString() : clamped.toString();
  await prisma.systemsetting.upsert({
    where: { key: DEFAULT_TAX_RATE_KEY },
    update: { value: normalized },
    create: {
      key: DEFAULT_TAX_RATE_KEY,
      value: normalized,
      description: "Thuế VAT hiển thị tại trang thanh toán",
    },
  });
  return Number(normalized);
}
