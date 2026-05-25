import type { Metadata } from "next";
import HomePageClient from "@/components/home/HomePageClient";
import { buildMetadata, SITE_DESCRIPTION } from "@/lib/metadata";

export const metadata: Metadata = buildMetadata({
  title: "Trang chủ",
  description: SITE_DESCRIPTION,
  path: "/",
  keywords: [
    "giải pháp công nghiệp",
    "phần mềm công nghiệp",
    "tự động hóa nhà máy",
    "tư vấn giải pháp sản xuất",
    "AHSO Industrial",
  ],
});

export default function HomePage() {
  return <HomePageClient />;
}
