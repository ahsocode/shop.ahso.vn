import type { Metadata } from "next";
import { buildMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildMetadata({
  title: "Đăng nhập",
  description:
    "Đăng nhập tài khoản AHSO Shop để quản lý đơn hàng, danh sách yêu thích và thông tin cá nhân.",
  path: "/login",
});

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
