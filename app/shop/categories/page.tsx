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
  const items = await prisma.productcategory.findMany({
    orderBy: [
      { productcategorylink: { _count: "desc" } },
      { name: "asc" },
    ],
    select: {
      id: true,
      name: true,
      slug: true,
      coverImage: true,
      _count: { select: { productcategorylink: true } },
      producttype: {
        orderBy: [
          { product: { _count: "desc" } },
          { name: "asc" },
        ],
        select: {
          id: true,
          name: true,
          slug: true,
          coverImage: true,
          _count: { select: { product: true } },
        },
      },
    },
  });

  return items.map((item) => ({
    id: item.id,
    name: item.name,
    slug: item.slug,
    coverImage: item.coverImage,
    productCount: item._count.productcategorylink,
    productTypes: item.producttype.map((type) => ({
      id: type.id,
      name: type.name,
      slug: type.slug,
      coverImage: type.coverImage,
      productCount: type._count.product,
    })),
  }));
}

function CategoriesFallback() {
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

        <div className="grid gap-6 grid-cols-1">
          {categories.map((cat) => (
            <div
              key={cat.id}
              className="group rounded-2xl border border-gray-200 bg-white shadow-sm hover:shadow-lg transition-all duration-200 overflow-hidden"
            >
              <Link
                href={`/shop/products?category=${encodeURIComponent(cat.slug)}`}
                className="flex items-center gap-4 p-4 sm:p-5"
              >
                <div className="relative h-16 w-16 sm:h-20 sm:w-20 rounded-xl border border-gray-100 bg-gray-50 overflow-hidden">
                  <Image
                    src={cat.coverImage || "/logo.png"}
                    alt={cat.name}
                    fill
                    sizes="(max-width: 640px) 64px, 80px"
                    className="object-contain p-3 transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 line-clamp-1">{cat.name}</h3>
                  <p className="text-xs text-gray-500 mt-1">
                    {cat.productCount} sản phẩm · {cat.productTypes.length} loại sản phẩm
                  </p>
                </div>
                <span className="text-sm font-semibold text-blue-600 group-hover:text-blue-700">
                  Xem
                </span>
              </Link>

              <div className="border-t border-gray-100 bg-gray-50/70">
                <div className="px-4 sm:px-5 py-2 text-xs font-semibold uppercase tracking-wide text-gray-600">
                  Loại sản phẩm trong danh mục
                </div>
                {cat.productTypes.length ? (
                  <div className="px-4 sm:px-5 pb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {cat.productTypes.map((type) => (
                      <Link
                        key={type.id}
                        href={`/shop/products?type=${encodeURIComponent(type.slug)}`}
                        className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-3 py-2.5 hover:border-blue-200 hover:shadow-sm transition"
                      >
                        <div className="relative h-12 w-12 rounded-lg bg-gray-50 border border-gray-100 overflow-hidden flex items-center justify-center">
                          <Image
                            src={type.coverImage || cat.coverImage || "/logo.png"}
                            alt={type.name}
                            width={48}
                            height={48}
                            className="object-contain p-1"
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900 line-clamp-1">
                            {type.name}
                          </p>
                          <p className="text-xs text-gray-500">{type.productCount} sản phẩm</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="px-4 sm:px-5 pb-4 text-sm text-gray-500">
                    Chưa có loại sản phẩm trong danh mục này.
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
