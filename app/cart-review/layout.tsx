import type { Metadata } from "next";
import { buildMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildMetadata({
  title: "Xem lại đơn hàng",
  description:
    "Kiểm tra thông tin sản phẩm, địa chỉ và chi phí trước khi gửi đơn hàng tại AHSO Industrial.",
  path: "/cart-review",
});

export default function CartReviewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
