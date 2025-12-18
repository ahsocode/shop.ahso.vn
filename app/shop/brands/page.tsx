import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Thương hiệu cộng tác | AHSO",
  description: "Danh sách toàn bộ thương hiệu cộng tác và phân phối tại AHSO.",
};

// ép route này luôn dynamic (không cố static hoá)
export const dynamic = "force-dynamic";

async function getBrands() {
  const items = await prisma.brand.findMany({
    orderBy: [
      { product: { _count: "desc" } },
      { name: "asc" },
    ],
    select: {
      id: true,
      name: true,
      slug: true,
      logoUrl: true,
      _count: { select: { product: true } },
    },
  });

  return items.map((item) => ({
    id: item.id,
    name: item.name,
    slug: item.slug,
    logoUrl: item.logoUrl,
    productCount: item._count.product,
  }));
}

export default async function BrandsPage() {
  const SKIP_BUILD_DB = process.env.SKIP_BUILD_DB === "true";

  // Khi build trên CI (có set SKIP_BUILD_DB) -> không đụng Prisma
  if (SKIP_BUILD_DB) {
    return (
      <div className="min-h-screen bg-linear-to-b from-gray-50 to-white">
        <div className="bg-white/60 backdrop-blur">
          <div className="w-full px-4 sm:px-6 lg:px-8 pt-6">
            <div className="flex items-center gap-2 text-sm font-semibold text-blue-700">
              <Link
                href="/shop/products"
                className="px-4 py-2 rounded-full bg-white text-blue-700 border border-blue-200 hover:border-blue-400 hover:text-blue-800"
              >
                Sản phẩm &amp; Linh kiện
              </Link>
              <Link
                href="/shop/categories"
                className="px-4 py-2 rounded-full bg-white text-blue-700 border border-blue-200 hover:border-blue-400 hover:text-blue-800"
              >
                Toàn bộ danh mục
              </Link>
              <span className="px-4 py-2 rounded-full bg-blue-600 text-white shadow border border-blue-600">
                Thương hiệu cộng tác
              </span>
            </div>
          </div>
        </div>
        <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
          <nav className="text-sm text-gray-500 mb-4 flex items-center gap-2">
            <Link href="/" className="hover:text-gray-900">
              Trang chủ
            </Link>
            <span>/</span>
            <Link href="/shop/products" className="hover:text-gray-900">
              Sản phẩm
            </Link>
            <span>/</span>
            <span className="text-gray-700 font-medium">Thương hiệu</span>
          </nav>

          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
            Thương hiệu cộng tác
          </h1>
          <p className="text-gray-600 max-w-3xl mb-4">
            Danh sách thương hiệu sẽ được tải đầy đủ ở môi trường chạy thật (server).
          </p>
          <p className="text-xs text-gray-400">
            (CI đang build với SKIP_BUILD_DB nên trang này không gọi database trong lúc build.)
          </p>
        </div>
      </div>
    );
  }

  // Môi trường chạy thật (VPS): query DB như bình thường
  const brands = await getBrands();

  return (
    <div className="min-h-screen bg-linear-to-b from-gray-50 to-white">
      <div className="bg-white/60 backdrop-blur">
        <div className="w-full px-4 sm:px-6 lg:px-8 pt-6">
          <div className="flex items-center gap-2 text-sm font-semibold text-blue-700">
            <Link
              href="/shop/products"
              className="px-4 py-2 rounded-full bg-white text-blue-700 border border-blue-200 hover:border-blue-400 hover:text-blue-800"
            >
              Sản phẩm &amp; Linh kiện
            </Link>
            <Link
              href="/shop/categories"
              className="px-4 py-2 rounded-full bg-white text-blue-700 border border-blue-200 hover:border-blue-400 hover:text-blue-800"
            >
              Toàn bộ danh mục
            </Link>
            <Link
              href="/shop/brands"
              className="px-4 py-2 rounded-full bg-blue-600 text-white shadow border border-blue-600"
            >
              Thương hiệu cộng tác
            </Link>
          </div>
        </div>
      </div>
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        <nav className="text-sm text-gray-500 mb-4 flex items-center gap-2">
          <Link href="/" className="hover:text-gray-900">
            Trang chủ
          </Link>
          <span>/</span>
          <Link href="/shop/products" className="hover:text-gray-900">
            Sản phẩm
          </Link>
          <span>/</span>
          <span className="text-gray-700 font-medium">Thương hiệu</span>
        </nav>

        <div className="flex items-center justify-between gap-3 mb-4">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Thương hiệu cộng tác</h1>
          <Link
            href="/shop/categories"
            className="text-sm font-semibold text-blue-600 hover:text-blue-700 underline"
          >
            Xem toàn bộ danh mục
          </Link>
        </div>
        <p className="text-gray-600 max-w-3xl mb-6">
          Các thương hiệu đối tác mà AHSO đang phân phối và đồng hành cùng khách hàng.
        </p>

        <div className="grid gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {brands.map((brand) => (
            <Link
              key={brand.id}
              href={`/shop/products?brand=${encodeURIComponent(brand.slug)}`}
              className="group rounded-2xl border border-gray-200 bg-white shadow-sm hover:shadow-lg transition-all duration-200 overflow-hidden"
            >
              <div className="aspect-4/3 bg-white relative flex items-center justify-center">
                <Image
                  src={brand.logoUrl || "/logo.png"}
                  alt={brand.name}
                  width={220}
                  height={120}
                  className="object-contain p-6 group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <div className="p-4 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">{brand.name}</h3>
                  <p className="text-xs text-gray-500">{brand.productCount} sản phẩm</p>
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
