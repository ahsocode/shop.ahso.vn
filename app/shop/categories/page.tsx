import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Tất cả danh mục sản phẩm | AHSO",
  description: "Khám phá toàn bộ danh mục sản phẩm và linh kiện công nghiệp tại AHSO.",
};

// Ép route này luôn dynamic để tránh Next.js cố prerender khi không có DB
export const dynamic = "force-dynamic";

async function getCategories() {
  return prisma.productcategory.findMany({
    orderBy: { productCount: "desc" },
    select: {
      id: true,
      name: true,
      slug: true,
      coverImage: true,
      productCount: true,
    },
  });
}

function CategoriesFallback() {
  return (
    <div className="min-h-screen bg-linear-to-b from-gray-50 to-white">
      <div className="bg-white/60 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-6">
          <div className="flex items-center gap-2 text-sm font-semibold text-blue-700">
            <Link
              href="/shop/products"
              className="px-4 py-2 rounded-full bg-white text-blue-700 border border-blue-200 hover:border-blue-400 hover:text-blue-800"
            >
              Sản phẩm &amp; Linh kiện
            </Link>
            <span className="px-4 py-2 rounded-full bg-blue-600 text-white shadow border border-blue-600">
              Toàn bộ danh mục
            </span>
            <Link
              href="/shop/brands"
              className="px-4 py-2 rounded-full bg-white text-blue-700 border border-blue-200 hover:border-blue-400 hover:text-blue-800"
            >
              Thương hiệu cộng tác
            </Link>
          </div>
        </div>
      </div>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <nav className="text-sm text-gray-500 mb-4 flex items-center gap-2">
          <Link href="/" className="hover:text-gray-900">
            Trang chủ
          </Link>
          <span>/</span>
          <Link href="/shop/products" className="hover:text-gray-900">
            Sản phẩm
          </Link>
          <span>/</span>
          <span className="text-gray-700 font-medium">Tất cả danh mục</span>
        </nav>

        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Tất cả danh mục</h1>
        <p className="text-gray-600 max-w-3xl mb-4">
          Danh mục sẽ được tải đầy đủ ở môi trường chạy thật (server).
        </p>
        <p className="text-xs text-gray-400">
          (CI đang build với SKIP_BUILD_DB nên trang này không gọi database trong lúc build.)
        </p>
      </div>
    </div>
  );
}

export default async function CategoriesPage() {
  const SKIP_BUILD_DB = process.env.SKIP_BUILD_DB === "true";

  // Khi build CI không có DB, trả về skeleton nhẹ, tránh gọi Prisma
  if (SKIP_BUILD_DB) {
    return <CategoriesFallback />;
  }

  let categories;
  try {
    categories = await getCategories();
  } catch (err) {
    console.error("[categories] DB error, fallback UI:", err);
    return <CategoriesFallback />;
  }

  return (
    <div className="min-h-screen bg-linear-to-b from-gray-50 to-white">
      <div className="bg-white/60 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-6">
          <div className="flex items-center gap-2 text-sm font-semibold text-blue-700">
            <Link
              href="/shop/products"
              className="px-4 py-2 rounded-full bg-white text-blue-700 border border-blue-200 hover:border-blue-400 hover:text-blue-800"
            >
              Sản phẩm &amp; Linh kiện
            </Link>
            <Link
              href="/shop/categories"
              className="px-4 py-2 rounded-full bg-blue-600 text-white shadow border border-blue-600"
            >
              Toàn bộ danh mục
            </Link>
            <Link
              href="/shop/brands"
              className="px-4 py-2 rounded-full bg-white text-blue-700 border border-blue-200 hover:border-blue-400 hover:text-blue-800"
            >
              Thương hiệu cộng tác
            </Link>
          </div>
        </div>
      </div>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <nav className="text-sm text-gray-500 mb-4 flex items-center gap-2">
          <Link href="/" className="hover:text-gray-900">
            Trang chủ
          </Link>
          <span>/</span>
          <Link href="/shop/products" className="hover:text-gray-900">
            Sản phẩm
          </Link>
          <span>/</span>
          <span className="text-gray-700 font-medium">Tất cả danh mục</span>
        </nav>

        <div className="flex items-center justify-between gap-3 mb-4">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Tất cả danh mục</h1>
          <Link
            href="/shop/brands"
            className="text-sm font-semibold text-blue-600 hover:text-blue-700 underline"
          >
            Xem toàn bộ thương hiệu
          </Link>
        </div>
        <p className="text-gray-600 max-w-3xl mb-6">
          Danh mục đầy đủ các sản phẩm và linh kiện công nghiệp tại AHSO. Chọn nhóm phù hợp để
          tìm nhanh sản phẩm bạn cần.
        </p>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/shop/products?category=${encodeURIComponent(cat.slug)}`}
              className="group rounded-2xl border border-gray-200 bg-white shadow-sm hover:shadow-lg transition-all duration-200 overflow-hidden"
            >
              <div className="aspect-4/3 bg-gray-50 relative">
                <Image
                  src={cat.coverImage || "/logo.png"}
                  alt={cat.name}
                  fill
                  className="object-contain p-4 group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <div className="p-4 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">{cat.name}</h3>
                  <p className="text-xs text-gray-500">{cat.productCount} sản phẩm</p>
                </div>
                <span className="text-sm font-semibold text-blue-600 group-hover:text-blue-700">
                  Xem
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
