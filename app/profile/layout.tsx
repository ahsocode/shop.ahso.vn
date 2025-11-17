import type { Metadata } from "next";
import { buildMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildMetadata({
  title: "Tài khoản của tôi",
  description:
    "Quản lý thông tin cá nhân, địa chỉ và đơn hàng đã mua tại AHSO Shop.",
  path: "/profile",
});

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
