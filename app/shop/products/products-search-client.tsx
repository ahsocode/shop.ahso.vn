"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import FilterLayout from "../filterlayout";

type Product = { sku: string; name: string; brand: string; category: string; price: number; inStock: boolean };

const BRANDS = ["Siemens", "Omron", "Schneider", "SICK"];
const CATEGORIES = ["PLC", "Sensor", "Inverter", "HMI", "Motor"];

export default function ProductsSearchClient() {
  const router = useRouter();
  const sp = useSearchParams();

  const [q, setQ] = useState(sp.get("q") ?? "");
  const [brand, setBrand] = useState(sp.get("brand") ?? "");
  const [category, setCategory] = useState(sp.get("category") ?? "");
  const [minPrice, setMinPrice] = useState(sp.get("minPrice") ?? "");
  const [maxPrice, setMaxPrice] = useState(sp.get("maxPrice") ?? "");
  const [inStock, setInStock] = useState(sp.get("inStock") === "true");
  const [sort, setSort] = useState(sp.get("sort") ?? "relevance");
  const [page, setPage] = useState(Number(sp.get("page") ?? "1"));

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const pageSize = 12;

  const params = useMemo(() => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (brand) p.set("brand", brand);
    if (category) p.set("category", category);
    if (minPrice) p.set("minPrice", minPrice);
    if (maxPrice) p.set("maxPrice", maxPrice);
    if (inStock) p.set("inStock", "true");
    if (sort && sort !== "relevance") p.set("sort", sort);
    p.set("page", String(page));
    p.set("pageSize", String(pageSize));
    return p;
  }, [q, brand, category, minPrice, maxPrice, inStock, sort, page]);

  useEffect(() => {
    const url = `/api/search/products?${params.toString()}`;
    router.replace(`/shop/products?${params.toString()}`, { scroll: false });

    let aborted = false;
    setLoading(true);
    fetch(url)
      .then((r) => r.json())
      .then((json) => {
        if (aborted) return;
        setData(json.data ?? []);
        setTotal(json.meta?.total ?? 0);
      })
      .finally(() => !aborted && setLoading(false));

    return () => { aborted = true; };
  }, [params, router]);

  useEffect(() => { setPage(1); }, [q, brand, category, minPrice, maxPrice, inStock, sort]);

  const pages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <FilterLayout
      searchBar={
        <div className="relative">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tìm theo tên sản phẩm hoặc mã hàng…"
            className="w-full rounded-md border px-4 py-3 pl-11 bg-white shadow-sm"
          />
          <svg viewBox="0 0 24 24" className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" stroke="currentColor" fill="none">
            <circle cx="11" cy="11" r="7" strokeWidth="2" />
            <path d="M20 20l-3.5-3.5" strokeWidth="2" />
          </svg>
        </div>
      }
      sidebar={
        <>
          <h3 className="font-semibold mb-4">Bộ lọc (Sản phẩm & Linh kiện)</h3>

          <label className="block text-sm font-medium mb-1">Thương hiệu</label>
          <select className="w-full border rounded-md px-3 py-2 mb-4" value={brand} onChange={(e) => setBrand(e.target.value)}>
            <option value="">Tất cả</option>
            {BRANDS.map((b) => (<option key={b} value={b}>{b}</option>))}
          </select>

          <label className="block text-sm font-medium mb-1">Danh mục</label>
          <select className="w-full border rounded-md px-3 py-2 mb-4" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">Tất cả</option>
            {CATEGORIES.map((c) => (<option key={c} value={c}>{c}</option>))}
          </select>

          <label className="block text-sm font-medium mb-1">Khoảng giá (USD)</label>
          <div className="flex items-center gap-2 mb-4">
            <input
              inputMode="numeric"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value.replace(/[^\d]/g, ""))}
              placeholder="Tối thiểu"
              className="w-full border rounded-md px-3 py-2"
            />
            <span className="text-gray-400">—</span>
            <input
              inputMode="numeric"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value.replace(/[^\d]/g, ""))}
              placeholder="Tối đa"
              className="w-full border rounded-md px-3 py-2"
            />
          </div>

          <div className="flex items-center gap-2 mb-4">
            <input id="instock" type="checkbox" checked={inStock} onChange={(e) => setInStock(e.target.checked)} className="h-4 w-4" />
            <label htmlFor="instock" className="text-sm">Chỉ hiển thị hàng còn sẵn</label>
          </div>

          <button
            onClick={() => { setQ(""); setBrand(""); setCategory(""); setMinPrice(""); setMaxPrice(""); setInStock(false); setSort("relevance"); }}
            className="w-full rounded-md border px-3 py-2 text-sm"
          >
            Xóa bộ lọc
          </button>
        </>
      }
      topInfo={
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">{loading ? "Đang tải..." : `Tìm thấy ${total} kết quả`}</div>
          <select value={sort} onChange={(e) => setSort(e.target.value)} className="rounded-md border px-3 py-2 text-sm" title="Sắp xếp">
            <option value="relevance">Phù hợp nhất</option>
            <option value="price_asc">Giá tăng dần</option>
            <option value="price_desc">Giá giảm dần</option>
            <option value="name_asc">Tên A → Z</option>
            <option value="name_desc">Tên Z → A</option>
          </select>
        </div>
      }
    >
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4 min-h-60">
        {loading && data.length === 0 ? (
          <div className="col-span-full text-center text-sm text-gray-600">Đang tải…</div>
        ) : data.length === 0 ? (
          <div className="col-span-full text-center text-sm text-gray-600">Không có kết quả phù hợp</div>
        ) : (
          data.map((p) => (
            <article key={p.sku} className="border rounded-xl p-4 bg-white shadow-sm hover:shadow-md transition">
              <div className="aspect-square bg-gray-100 rounded-md mb-3" />
              <h3 className="font-semibold line-clamp-2">{p.name}</h3>
              <div className="text-sm text-gray-600 mt-1">{p.brand} • {p.category}</div>
              <div className="mt-2 font-bold">{p.price.toLocaleString()} USD</div>
              <div className={`mt-1 text-xs ${p.inStock ? "text-emerald-600" : "text-rose-600"}`}>
                {p.inStock ? "Còn hàng" : "Hết hàng"}
              </div>
              <button className="mt-3 w-full rounded-md bg-blue-600 text-white py-2 text-sm font-semibold hover:bg-blue-700">
                Thêm vào giỏ
              </button>
            </article>
          ))
        )}
      </div>

      {pages > 1 && (
        <div className="mt-2 flex justify-center gap-2">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-2 rounded-md border disabled:opacity-50">Trước</button>
          <span className="px-3 py-2 text-sm">{page}/{pages}</span>
          <button onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page === pages} className="px-3 py-2 rounded-md border disabled:opacity-50">Sau</button>
        </div>
      )}
    </FilterLayout>
  );
}