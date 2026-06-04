import type { Metadata } from "next";
import { buildMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildMetadata({
  title: "Đăng nhập",
  description:
    "Đăng nhập tài khoản AHSO Industrial để quản lý hồ sơ, yêu cầu và thông tin cá nhân.",
  path: "/login",
});

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
