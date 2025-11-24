import type { Metadata } from "next";
import { buildMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildMetadata({
  title: "Giỏ hàng",
  description:
    "Xem và quản lý các sản phẩm công nghiệp được thêm vào giỏ hàng trước khi thanh toán.",
  path: "/cart",
  keywords: [
    "giỏ hàng ahso",
    "thiết bị công nghiệp",
    "sản phẩm đã chọn",
    "đơn hàng ahso",
  ],
});

export default function CartLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
//