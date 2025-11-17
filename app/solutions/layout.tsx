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
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 bg-white rounded-xl shadow-md">
      <h1 className="text-3xl sm:text-4xl font-bold mb-6 text-gray-800">AHSO Industrial</h1>
      <div className="mt-2">{children}</div>
    </div>
  );
}
