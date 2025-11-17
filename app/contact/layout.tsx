import type { Metadata } from "next";
import { buildMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildMetadata({
  title: "Liên hệ",
  description:
    "Liên hệ AHSO Shop để được tư vấn giải pháp công nghiệp, báo giá thiết bị và hỗ trợ kỹ thuật 24/7.",
  path: "/contact",
  keywords: [
    "liên hệ ahso",
    "tư vấn công nghiệp",
    "báo giá thiết bị",
    "hỗ trợ kỹ thuật",
  ],
});

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
