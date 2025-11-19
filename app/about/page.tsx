import type { Metadata } from "next";
import AboutPageClient from "@/components/about/AboutPageClient";
import { buildMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildMetadata({
  title: "Về AHSO",
  description:
    "Tìm hiểu về AHSO Industrial - đối tác cung cấp giải pháp tự động hóa, công nghệ và phần mềm cho doanh nghiệp Việt Nam.",
  path: "/about",
  keywords: [
    "AHSO Industrial",
    "giới thiệu AHSO",
    "giải pháp công nghiệp",
    "tự động hóa nhà máy",
  ],
});

export default function AboutPage() {
  return <AboutPageClient />;
}
//about page