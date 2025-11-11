"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  ShoppingCart,
  Star,
  StarHalf,
  X,
} from "lucide-react";
import AddToCartClient from "./[slug]/AddToCartClient";

type BrandObj = { name: string; slug: string; logoUrl?: string; id?: string };
type ProductCard = {
  slug: string;
  name: string;
  sku: string;
  image: string;
  brand: string | BrandObj | null;
  brandSlug: string | null;
  category: string | null;
  price: number;
  currency: string | null;
  inStock: boolean;
  description?: string | null;
  ratingAvg?: number;
  ratingCount?: number;
  purchaseCount?: number;
};

type BrandOpt = { name: string; slug: string; productCount?: number };
type CategoryOpt = { name: string; slug: string; fullSlug?: string; level?: number };

function useDebounced<T>(value: T, delay = 400) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

function StarRating({
  value = 0,
  size = 14,
  className = "text-amber-500",
}: {
  value?: number;
  size?: number;
  className?: string;
}) {
  const full = Math.floor(value);
  const hasHalf = value - full >= 0.25 && value - full < 0.75;
  const rest = 5 - full - (hasHalf ? 1 : 0);
  return (
    <div className={`inline-flex items-center gap-0.5 ${className}`} aria-label={`Đánh giá ${value.toFixed(1)} / 5`}>
      {Array.from({ length: full }).map((_, i) => (
        <Star key={`f-${i}`} width={size} height={size} fill="currentColor" />
      ))}
      {hasHalf && <StarHalf width={size} height={size} fill="currentColor" />}
      {Array.from({ length: rest }).map((_, i) => (
        <Star key={`e-${i}`} width={size} height={size} className="opacity-25" />
      ))}
    </div>
  );
}

export default function ProductsSearchClient() {
  const [q, setQ] = useState("");
  const [brand, setBrand] = useState("");
  const [category, setCategory] = useState("");
  const [minPrice, setMinPrice] = useState<string>("");
  const [maxPrice, setMaxPrice] = useState<string>("");
  const [inStock, setInStock] = useState(false);
  const [sort, setSort] = useState("relevance");
  const [page, setPage] = useState(1);
  const pageSize = 12;

  const dq = useDebounced(q);

  const [items, setItems] = useState<ProductCard[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [brands, setBrands] = useState<BrandOpt[]>([]);
  const [categories, setCategories] = useState<CategoryOpt[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const [b, c] = await Promise.all([
          fetch("/api/brands", { cache: "no-store" }).then((r) => r.json()).catch(() => null),
          fetch("/api/categories", { cache: "no-store" }).then((r) => r.json()).catch(() => null),
        ]);
        // Fix: API trả về 'items' thay vì 'data'
        if (b?.items) setBrands(b.items);
        if (c?.items) setCategories(c.items);
      } catch {}
    })();
  }, []);

  useEffect(() => {
    const url = new URL("/api/products", window.location.origin);
    url.searchParams.set("page", String(page));
    url.searchParams.set("pageSize", String(pageSize));
    if (dq) url.searchParams.set("q", dq);
    if (brand) url.searchParams.set("brand", brand);
    if (category) url.searchParams.set("category", category);
    if (minPrice) url.searchParams.set("minPrice", minPrice);
    if (maxPrice) url.searchParams.set("maxPrice", maxPrice);
    if (inStock) url.searchParams.set("inStock", "true");
    if (sort) url.searchParams.set("sort", sort);

    setLoading(true);
    fetch(url.toString(), { cache: "no-store" })
      .then((r) => r.json())
      .then((json) => {
        if (json?.success) {
          setItems(json.data as ProductCard[]);
          const meta = json.meta || json.pagination || {};
          setTotal(meta.total ?? 0);
        } else {
          setItems([]);
          setTotal(0);
        }
      })
      .catch(() => {
        setItems([]);
        setTotal(0);
      })
      .finally(() => setLoading(false));
  }, [dq, brand, category, minPrice, maxPrice, inStock, sort, page]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total]);

  function resetFilters() {
    setQ("");
    setBrand("");
    setCategory("");
    setMinPrice("");
    setMaxPrice("");
    setInStock(false);
    setSort("relevance");
    setPage(1);
  }

  const hasActiveFilters = q || brand || category || minPrice || maxPrice || inStock || sort !== "relevance";

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-50 to-gray-100">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        

        {/* Search & Filters */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
          {/* Search Bar - Full Width */}
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setPage(1);
                }}
                placeholder="Tìm kiếm sản phẩm theo tên, SKU, mô tả..."
                className="w-full pl-12 pr-12 py-3.5 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none transition-all text-sm"
              />
              {q && (
                <button
                  onClick={() => {
                    setQ("");
                    setPage(1);
                  }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>
          </div>

          {/* Filters Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Brand */}
            <select
              className="px-4 py-2.5 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none transition-all text-sm bg-white"
              value={brand}
              onChange={(e) => {
                setBrand(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Tất cả thương hiệu</option>
              {brands.map((b) => (
                <option key={b.slug} value={b.slug}>
                  {b.name} {b.productCount ? `(${b.productCount})` : ""}
                </option>
              ))}
            </select>

            {/* Category */}
            <select
              className="px-4 py-2.5 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none transition-all text-sm bg-white"
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Tất cả danh mục</option>
              {categories.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>

            {/* Sort */}
            <select
              className="px-4 py-2.5 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none transition-all text-sm bg-white"
              value={sort}
              onChange={(e) => {
                setSort(e.target.value);
                setPage(1);
              }}
            >
              <option value="relevance">Liên quan nhất</option>
              <option value="price_asc">Giá tăng dần</option>
              <option value="price_desc">Giá giảm dần</option>
              <option value="name_asc">Tên A—Z</option>
              <option value="name_desc">Tên Z—A</option>
            </select>

            {/* Stock Filter */}
            <button
              onClick={() => {
                setInStock(!inStock);
                setPage(1);
              }}
              className={`rounded-xl px-4 py-2.5 text-sm font-medium flex items-center gap-2 justify-center transition-all ${
                inStock
                  ? "bg-emerald-500 text-white shadow-lg shadow-emerald-200"
                  : "border-2 border-gray-200 text-gray-700 hover:border-emerald-300 hover:bg-emerald-50"
              }`}
            >
              <Filter className="h-4 w-4" />
              {inStock ? "Còn hàng" : "Tất cả"}
            </button>

            {/* Reset Button */}
            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="rounded-xl border-2 border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2 justify-center"
              >
                <X className="h-4 w-4" />
                Xóa bộ lọc
              </button>
            )}
          </div>
        </div>

        {/* Results Summary */}
        <div className="mb-4 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            {loading ? (
              <span className="flex items-center gap-2">
                <div className="h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                Đang tải...
              </span>
            ) : (
              <span className="font-medium text-gray-900">
                {total} sản phẩm
                {hasActiveFilters && " được tìm thấy"}
              </span>
            )}
          </div>
        </div>

        {/* Products Grid */}
        <div className="grid gap-5 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
          {loading
            ? Array.from({ length: pageSize }).map((_, i) => (
                <div key={i} className="animate-pulse rounded-2xl border border-gray-200 bg-white overflow-hidden">
                  <div className="aspect-square bg-gray-100" />
                  <div className="p-4 space-y-3">
                    <div className="h-4 bg-gray-100 rounded" />
                    <div className="h-4 w-2/3 bg-gray-100 rounded" />
                    <div className="h-6 w-1/2 bg-gray-100 rounded" />
                  </div>
                </div>
              ))
            : items.map((p) => {
                const brandLabel = typeof p.brand === "string" ? p.brand : p.brand?.name ?? "—";
                const rating = Number(p.ratingAvg ?? 0);
                const ratingCount = Number(p.ratingCount ?? 0);
                const purchases = Number(p.purchaseCount ?? 0);

                return (
                  <div
                    key={p.slug}
                    className="group rounded-2xl border border-gray-200 bg-white overflow-hidden flex flex-col hover:shadow-xl hover:border-gray-300 transition-all duration-300"
                  >
                    <Link
                      href={`/shop/products/${p.slug}`}
                      className="relative block aspect-square bg-gray-50 overflow-hidden"
                    >
                      <Image
                        src={p.image || "/logo.png"}
                        alt={p.name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      {!p.inStock && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <span className="bg-white text-gray-900 px-4 py-2 rounded-full text-sm font-semibold">
                            Hết hàng
                          </span>
                        </div>
                      )}
                    </Link>

                    <div className="p-4 flex-1 flex flex-col gap-2">
                      <Link
                        href={`/shop/products/${p.slug}`}
                        className="font-semibold text-gray-900 line-clamp-2 hover:text-blue-600 transition-colors leading-snug"
                        title={p.name}
                      >
                        {p.name}
                      </Link>

                      <div className="text-xs text-gray-500 font-medium">{brandLabel}</div>

                      {/* Rating */}
                      {rating > 0 && (
                        <div className="flex items-center gap-2">
                          <StarRating value={rating} size={13} />
                          <span className="text-xs font-medium text-gray-700">
                            {rating.toFixed(1)}
                            <span className="text-gray-400 font-normal"> ({ratingCount})</span>
                          </span>
                        </div>
                      )}

                      {/* Purchase Count */}
                      {purchases > 0 && (
                        <div className="text-xs text-gray-500 flex items-center gap-1.5">
                          <ShoppingCart className="h-3.5 w-3.5" />
                          Đã bán {purchases.toLocaleString()}
                        </div>
                      )}

                      {/* Description */}
                      {p.description && (
                        <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
                          {p.description}
                        </p>
                      )}

                      {/* Price & Add to Cart */}
                      <div className="mt-auto pt-3 flex items-center justify-between border-t border-gray-100">
                        <div className="flex flex-col">
                          <span className="text-lg font-bold text-gray-900">
                            {p.price.toLocaleString()}
                          </span>
                          <span className="text-xs text-gray-500">{p.currency ?? "VND"}</span>
                        </div>
                        <AddToCartClient sku={p.sku} name={p.name} image={p.image}>
                          <div className="bg-blue-500 hover:bg-blue-600 text-white rounded-xl p-2.5 transition-colors shadow-lg shadow-blue-200">
                            <ShoppingCart className="h-4 w-4" />
                          </div>
                        </AddToCartClient>
                      </div>
                    </div>
                  </div>
                );
              })}
        </div>

        {/* Empty State */}
        {!loading && items.length === 0 && (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
            <div className="text-gray-400 mb-4">
              <Search className="h-16 w-16 mx-auto" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Không tìm thấy sản phẩm</h3>
            <p className="text-gray-600 mb-6">Hãy thử điều chỉnh bộ lọc hoặc từ khóa tìm kiếm</p>
            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors font-medium"
              >
                <X className="h-4 w-4" />
                Xóa tất cả bộ lọc
              </button>
            )}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && !loading && (
          <div className="mt-8 flex items-center justify-center gap-2">
            <button
              className="rounded-xl border-2 border-gray-200 px-4 py-2 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            
            <div className="flex items-center gap-2">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (page <= 3) {
                  pageNum = i + 1;
                } else if (page >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = page - 2 + i;
                }
                
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={`min-w-10 h-10 rounded-xl font-medium transition-all ${
                      page === pageNum
                        ? "bg-blue-500 text-white shadow-lg shadow-blue-200"
                        : "border-2 border-gray-200 text-gray-700 hover:border-blue-300 hover:bg-blue-50"
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            <button
              className="rounded-xl border-2 border-gray-200 px-4 py-2 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}