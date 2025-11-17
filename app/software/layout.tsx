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
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 bg-white rounded-xl shadow-md">
      <h1 className="text-3xl sm:text-4xl font-bold mb-6 text-gray-800">AHSO Industrial</h1>
      <div className="mt-2">{children}</div>
    </div>
  );
}
