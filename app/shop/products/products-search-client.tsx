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

  // ---- fields mới từ API list ----
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
        <Star key={`f-${i}`} width={size} height={size} />
      ))}
      {hasHalf && <StarHalf width={size} height={size} />}
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
        if (b?.success) setBrands(b.data);
        if (c?.success) setCategories(c.data);
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
    // url.searchParams.set("status", "ALL"); // bật khi muốn xem cả DRAFT

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

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
      {/* Controls */}
      <div className="mb-5 grid grid-cols-1 md:grid-cols-12 gap-3">
        <div className="md:col-span-4">
          <div className="flex items-center gap-2 rounded-xl border px-3 py-2 bg-white">
            <Search className="h-4 w-4 text-gray-500" />
            <input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              placeholder="Tìm sản phẩm, SKU…"
              className="w-full outline-none text-sm"
            />
          </div>
        </div>

        <div className="md:col-span-8 grid grid-cols-2 md:grid-cols-6 gap-3">
          <select
            className="border rounded-xl px-3 py-2 text-sm"
            value={brand}
            onChange={(e) => {
              setBrand(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Thương hiệu</option>
            {brands.map((b) => (
              <option key={b.slug} value={b.slug}>
                {b.name}
              </option>
            ))}
          </select>

          <select
            className="border rounded-xl px-3 py-2 text-sm"
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Danh mục</option>
            {categories.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>

          {/* <input className="border rounded-xl px-3 py-2 text-sm" type="number" min={0}
                 value={minPrice} onChange={(e)=>{setMinPrice(e.target.value); setPage(1);}}
                 placeholder="Giá từ" />
          <input className="border rounded-xl px-3 py-2 text-sm" type="number" min={0}
                 value={maxPrice} onChange={(e)=>{setMaxPrice(e.target.value); setPage(1);}}
                 placeholder="Giá đến" /> */}

          <select
            className="border rounded-xl px-3 py-2 text-sm"
            value={sort}
            onChange={(e) => {
              setSort(e.target.value);
              setPage(1);
            }}
          >
            <option value="relevance">Theo</option>
            <option value="price_asc">Giá ↑</option>
            <option value="price_desc">Giá ↓</option>
            <option value="name_asc">Tên A–Z</option>
            <option value="name_desc">Tên Z–A</option>
          </select>

          <button
            onClick={() => {
              setInStock(!inStock);
              setPage(1);
            }}
            className={`rounded-xl border px-3 py-2 text-sm flex items-center gap-2 justify-center ${
              inStock ? "bg-emerald-50 border-emerald-300" : ""
            }`}
            title="Chỉ hiện còn hàng"
          >
            <Filter className="h-4 w-4" /> {inStock ? "Còn hàng" : "Tất cả"}
          </button>
        </div>
      </div>

      {/* Summary + reset */}
      <div className="mb-3 flex items-center justify-between text-sm">
        <div>{loading ? "Đang tải…" : `Tìm thấy ${total} sản phẩm`}</div>
        <button onClick={resetFilters} className="text-blue-600 hover:underline">
          Đặt lại bộ lọc
        </button>
      </div>

      {/* Grid */}
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
        {loading
          ? Array.from({ length: pageSize }).map((_, i) => (
              <div key={i} className="animate-pulse rounded-xl border bg-white">
                <div className="h-36 bg-gray-100 rounded-t-xl" />
                <div className="p-3 space-y-2">
                  <div className="h-4 bg-gray-100 rounded" />
                  <div className="h-4 w-2/3 bg-gray-100 rounded" />
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
                  className="group rounded-xl border bg-white overflow-hidden flex flex-col"
                >
                  <Link
                    href={`/shop/products/${p.slug}`}
                    className="relative block aspect-4/3 bg-gray-50"
                  >
                    <Image
                      src={p.image || "/logo.png"}
                      alt={p.name}
                      fill
                      className="object-cover group-hover:scale-[1.02] transition-transform"
                    />
                    {!p.inStock && (
                      <span className="absolute top-2 left-2 text-[11px] rounded-md bg-rose-600 text-white px-2 py-0.5">
                        Hết hàng
                      </span>
                    )}
                  </Link>

                  <div className="p-3 flex-1 flex flex-col gap-1.5">
                    <Link
                      href={`/shop/products/${p.slug}`}
                      className="font-medium line-clamp-2 hover:underline"
                      title={p.name}
                    >
                      {p.name}
                    </Link>

                    <div className="text-xs text-gray-500">{brandLabel || "—"}</div>

                    {/* Rating + count + purchases */}
                    <div className="flex items-center justify-between mt-0.5">
                      <div className="flex items-center gap-1.5">
                        <StarRating value={rating} />
                        <span className="text-xs text-gray-600">
                          {rating ? rating.toFixed(1) : "0.0"}
                          <span className="text-gray-400"> ({ratingCount})</span>
                        </span>
                      </div>
                      <div className="text-[11px] inline-flex items-center gap-1 text-gray-500">
                        <ShoppingCart className="h-3.5 w-3.5" />
                        {purchases?.toLocaleString?.() ?? purchases}
                      </div>
                    </div>

                    {/* Mô tả ngắn */}
                    {p.description && (
                      <p className="text-xs text-gray-600 line-clamp-2 mt-0.5">{p.description}</p>
                    )}

                    {/* Giá + Add to cart */}
                    <div className="mt-auto flex items-center justify-between pt-1.5">
                      <div className="font-semibold">
                        {p.price.toLocaleString()} {p.currency ?? ""}
                      </div>
                      <AddToCartClient sku={p.sku} name={p.name} image={p.image}>
                        <ShoppingCart className="h-4 w-4 sm:ml-1" />
                      </AddToCartClient>
                    </div>
                  </div>
                </div>
              );
            })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-2">
          <button
            className="rounded-lg border px-3 py-2 disabled:opacity-50"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm">
            Trang {page}/{totalPages}
          </span>
          <button
            className="rounded-lg border px-3 py-2 disabled:opacity-50"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
