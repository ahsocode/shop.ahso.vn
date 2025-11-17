import type { Metadata } from "next";
import { buildMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildMetadata({
  title: "Đặt lại mật khẩu",
  description:
    "Thiết lập mật khẩu mới cho tài khoản AHSO Shop và bảo vệ thông tin của bạn.",
  path: "/reset-password",
});

export default function ResetPasswordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
