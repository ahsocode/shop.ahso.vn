import type { Metadata } from "next";
import { buildMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildMetadata({
  title: "Cập nhật thông tin",
  description:
    "Chỉnh sửa thông tin cá nhân, địa chỉ và mật khẩu tài khoản AHSO Industrial.",
  path: "/profile/edit",
});

export default function ProfileEditLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
