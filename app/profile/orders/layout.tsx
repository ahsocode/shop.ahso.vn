import type { Metadata } from "next";
import { buildMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildMetadata({
  title: "Đơn hàng của tôi",
  description:
    "Xem lịch sử mua sắm và trạng thái đơn hàng tại AHSO Industrial.",
  path: "/profile/orders",
});

export default function ProfileOrdersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
