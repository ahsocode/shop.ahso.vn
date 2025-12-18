import type { Metadata } from "next";
import { buildMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildMetadata({
  title: "Giải pháp công nghiệp",
  description:
    "Khám phá danh mục giải pháp công nghiệp, tự động hóa và chuyển đổi số được AHSO triển khai cho nhiều ngành sản xuất.",
  path: "/solutions",
  keywords: [
    "giải pháp công nghiệp",
    "tự động hóa nhà máy",
    "chuyển đổi số sản xuất",
    "tích hợp hệ thống",
  ],
});

export default function SolutionsLayout({ children }: { children: React.ReactNode }) {
  return <div className="w-full">{children}</div>;
}
