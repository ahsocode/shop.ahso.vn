import type { Metadata } from "next";
import { buildMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildMetadata({
  title: "Chính sách & Điều khoản",
  description:
    "Tìm hiểu chính sách bán hàng, giao hàng, bảo hành và điều khoản sử dụng dịch vụ của AHSO Industrial.",
  path: "/policy",
  keywords: [
    "chính sách bán hàng",
    "giao hàng ahso",
    "bảo hành thiết bị",
    "điều khoản sử dụng",
  ],
});

export default function PolicyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
