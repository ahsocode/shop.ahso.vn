import type { Metadata } from "next";
import { buildMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildMetadata({
  title: "Đăng ký",
  description:
    "Tạo tài khoản AHSO Shop để đặt hàng nhanh chóng và theo dõi lịch sử mua sắm.",
  path: "/register",
});

export default function RegisterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
