import type { Metadata } from "next";
import { buildMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildMetadata({
  title: "Thanh toán",
  description:
    "Nhập thông tin giao hàng và lựa chọn phương thức thanh toán an toàn trên AHSO Industrial.",
  path: "/checkout",
});

export default function CheckoutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
