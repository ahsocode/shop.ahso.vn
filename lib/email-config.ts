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
  TEMPLATES: {
    ORDER_CREATED: {
      subject: (orderCode: string) => `Xác nhận đơn hàng ${orderCode} - ${FROM_NAME}`,
      adminSubject: (orderCode: string) => `🔔 Đơn hàng mới ${orderCode} cần xử lý`,
    },
    ORDER_PAID: {
      subject: (orderCode: string) => `✅ Đơn hàng ${orderCode} đã được xác nhận thanh toán`,
    },
    ORDER_SHIPPED: {
      subject: (orderCode: string) => `📦 Đơn hàng ${orderCode} đã được giao cho vận chuyển`,
    },
    ORDER_CANCELLED: {
      subject: (orderCode: string) => `❌ Đơn hàng ${orderCode} đã bị hủy`,
    },
    ORDER_CANCEL_REJECTED: {
      subject: (orderCode: string) => `❗ Yêu cầu hủy đơn ${orderCode} đã bị từ chối`,
    },
    PROMOTION: {
      subject: "🎉 Chương trình khuyến mãi đặc biệt từ AHSO",
    },
  },
} as const;

// Helper format tiền VND
export function formatVND(n: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Math.max(0, Math.round(n)));
}
