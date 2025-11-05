import type { Metadata } from "next";
import { ShopTabs } from "./shoptab";

export const metadata: Metadata = {
  title: "Shop | AHSO Industrial",
  description: "Danh mục giải pháp công nghiệp, phần mềm & dịch vụ, sản phẩm & linh kiện.",
};

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 bg-white rounded-xl shadow-md">
      <h1 className="text-3xl sm:text-4xl font-bold mb-6 text-gray-800">Cửa hàng AHSO</h1>
      <ShopTabs />
      <div className="mt-6">{children}</div>
    </div>
  );
}