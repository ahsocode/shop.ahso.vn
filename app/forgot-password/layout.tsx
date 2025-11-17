import type { Metadata } from "next";
import { buildMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildMetadata({
  title: "Quên mật khẩu",
  description:
    "Khôi phục mật khẩu tài khoản AHSO Shop bằng email xác thực.",
  path: "/forgot-password",
});

export default function ForgotPasswordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
