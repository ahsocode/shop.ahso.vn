import type { Metadata } from "next";
import { buildMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildMetadata({
  title: "Hoàn tất đơn hàng",
  description:
    "Cảm ơn bạn đã đặt hàng tại AHSO Shop. Theo dõi thông tin xác nhận và hướng dẫn thanh toán.",
  path: "/thank-you",
});

export default function ThankYouLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
