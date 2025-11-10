import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Giải pháp Công Nghiệp | AHSO Shop",
};

export default function SolutionsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 bg-white rounded-xl shadow-md">
      <h1 className="text-3xl sm:text-4xl font-bold mb-6 text-gray-800">Cửa hàng AHSO</h1>
      <div className="mt-2">{children}</div>
    </div>
  );
}

