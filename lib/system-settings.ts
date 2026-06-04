import { prisma } from "@/lib/prisma";
import { EMAIL_CONFIG } from "@/lib/email-config";

export const CONTACT_NOTIFICATION_EMAIL_KEY = "contactNotificationEmail";

export async function getContactNotificationEmail(): Promise<string> {
  const setting = await prisma.systemsetting.findUnique({
    where: { key: CONTACT_NOTIFICATION_EMAIL_KEY },
  });
  return (setting?.value?.trim() || undefined) ?? process.env.ADMIN_EMAIL?.trim() ?? EMAIL_CONFIG.ADMIN_EMAIL;
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
