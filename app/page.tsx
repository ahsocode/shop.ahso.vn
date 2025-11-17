import type { Metadata } from "next";
import HomePageClient from "@/components/home/HomePageClient";
import { buildMetadata, SITE_DESCRIPTION } from "@/lib/metadata";

export const metadata: Metadata = buildMetadata({
  title: "Trang chủ",
  description: SITE_DESCRIPTION,
  path: "/",
  keywords: [
    "máy móc công nghiệp",
    "thiết bị tự động hóa",
    "giải pháp nhà máy thông minh",
    "linh kiện công nghiệp",
  ],
});

export default function HomePage() {
  return <HomePageClient />;
}
