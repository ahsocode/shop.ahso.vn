import Link from "next/link";

type ProductsTabsProps = {
  active: "products" | "gallery";
};

export default function ProductsTabs({ active }: ProductsTabsProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-white p-2 shadow-sm">
      <Link
        href="/admin/products/list"
        className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
          active === "products"
            ? "bg-blue-600 text-white shadow"
            : "text-gray-700 hover:bg-gray-100"
        }`}
      >
        Danh sách sản phẩm
      </Link>
      <Link
        href="/admin/products/galery"
        className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
          active === "gallery"
            ? "bg-blue-600 text-white shadow"
            : "text-gray-700 hover:bg-gray-100"
        }`}
      >
        Quản lý ảnh sản phẩm
      </Link>
    </div>
  );
}
