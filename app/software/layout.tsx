import type { Metadata } from "next";
import { buildMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildMetadata({
  title: "Phần mềm & dịch vụ công nghiệp",
  description:
    "Danh mục phần mềm quản lý sản xuất, MES, ERP, CMMS và dịch vụ triển khai của AHSO dành cho doanh nghiệp công nghiệp.",
  path: "/software",
  keywords: [
    "phần mềm MES",
    "phần mềm ERP",
    "giải pháp CMMS",
    "dịch vụ triển khai phần mềm công nghiệp",
  ],
});

export default function SoftwareLayout({ children }: { children: React.ReactNode }) {
  return <div className="w-full">{children}</div>;
}
