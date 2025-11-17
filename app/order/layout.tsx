import type { Metadata } from "next";
import { buildMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildMetadata({
  title: "Tra cứu đơn hàng",
  description:
    "Theo dõi trạng thái đơn hàng, xem chi tiết giao hàng và lịch sử mua sắm tại AHSO Shop.",
  path: "/order",
});

export default function OrderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
