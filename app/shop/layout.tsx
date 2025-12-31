// app/shop/layout.tsx
import type { Metadata } from "next";
import { ShopTabs } from "./shoptab";

export const metadata: Metadata = {
  title: "Shop | AHSO Industrial",
  description: "Danh mục giải pháp công nghiệp, phần mềm & dịch vụ, sản phẩm & linh kiện.",
};

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full">
      {/* Header Section - Full Width */}
      {/* <div className="bg-linear-to-r from-blue-600 to-blue-700 text-white shadow-lg"> */}
        <div className="mx-auto max-w-[1920px] px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">Cửa hàng AHSO</h1>
          {/* <p className="text-blue-100 text-sm">Khám phá sản phẩm công nghiệp chất lượng cao</p> */}
        </div>
      {/* </div> */}
      
      {/* Tabs Section */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="mx-auto max-w-[1920px] px-4 sm:px-6 lg:px-8">
          <ShopTabs />
        </div>
      </div>
      
      {/* Content - Full Width */}
      <div className="bg-gray-50 min-h-screen">
        {children}
      </div>
    </div>
  );
}