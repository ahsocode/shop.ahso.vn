"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import FilterLayout from "../filterlayout";
import { ShoppingCart } from "lucide-react";
import { toast } from "sonner";

type VariantCard = {
  sku: string;
  name: string;
  productSlug?: string | null;
  brand?: string | null;
  brandSlug?: string | null;
  category?: { name: string; slug: string } | null;
  image?: string | null;
  price: number;
  currency?: string;
  inStock: boolean;
};
type Brand = { name: string; slug: string; variantCount: number };
type Category = { name: string; slug: string; fullSlug: string; level: number };

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
  const [data, setData] = useState<VariantCard[]>([]);
  const [total, setTotal] = useState(0);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
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
    const url = `/api/products/variants?${params.toString()}`;
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

  // Load brands + categories for filters
  useEffect(() => {
    let aborted = false;
    fetch("/api/products/brands").then(r=>r.json()).then(json=>{ if(!aborted) setBrands(json.data ?? []); }).catch(()=>{});
    fetch("/api/products/categories").then(r=>r.json()).then(json=>{ if(!aborted) setCategories(json.data ?? []); }).catch(()=>{});
    return () => { aborted = true; };
  }, []);

  function flyToCartFrom(el: HTMLElement | null, image?: string | null) {
    try {
      if (!el) return;
      const target = document.getElementById("site-cart-icon");
      if (!target) return;
      const start = el.getBoundingClientRect();
      const end = target.getBoundingClientRect();
      const ghost = document.createElement(image ? "img" : "div");
      if (image) (ghost as HTMLImageElement).src = image;
      else ghost.textContent = "🛒";
      ghost.style.position = "fixed";
      ghost.style.left = `${start.left + start.width / 2}px`;
      ghost.style.top = `${start.top + start.height / 2}px`;
      ghost.style.width = image ? "40px" : "24px";
      ghost.style.height = image ? "40px" : "24px";
      ghost.style.borderRadius = "9999px";
      ghost.style.zIndex = "9999";
      ghost.style.pointerEvents = "none";
      ghost.style.transition = "transform 600ms cubic-bezier(0.22, 1, 0.36, 1), opacity 600ms";
      ghost.style.transform = "translate(-50%, -50%) scale(1)";
      document.body.appendChild(ghost);
      requestAnimationFrame(() => {
        const dx = end.left + end.width / 2 - (start.left + start.width / 2);
        const dy = end.top + end.height / 2 - (start.top + start.height / 2);
        ghost.style.transform = `translate(${dx - 20}px, ${dy - 20}px) scale(0.4)`;
        ghost.style.opacity = "0.3";
      });
      setTimeout(() => ghost.remove(), 700);
    } catch {}
  }

  async function handleAdd(p: VariantCard, btn: HTMLButtonElement | null) {
    try {
      const res = await fetch("/api/cart/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sku: p.sku, quantity: 1 }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data?.error || "Thêm vào giỏ thất bại");
        return;
      }
      flyToCartFrom(btn, p.image || undefined);
      toast.success(`Đã thêm "${p.name}" vào giỏ hàng.`);
    } catch {
      toast.error("Lỗi mạng. Vui lòng thử lại.");
    }
  }

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
            {brands.map((b) => (<option key={b.slug} value={b.slug}>{b.name}</option>))}
          </select>

          <label className="block text-sm font-medium mb-1">Danh mục</label>
          <select className="w-full border rounded-md px-3 py-2 mb-4" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">Tất cả</option>
            {categories.map((c) => (<option key={c.fullSlug} value={c.slug}>{'— '.repeat(Math.max(0, c.level))}{c.name}</option>))}
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
            <span className="text-gray-400">-</span>
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
            <label htmlFor="instock" className="text-sm">Chỉ hiện thị hàng còn sẵn</label>
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
            <article key={p.sku} className="border rounded-xl p-4 bg-white shadow-sm hover:shadow-md transition flex flex-col">
              <Link href={`/shop/products/${encodeURIComponent(p.productSlug || '')}/${encodeURIComponent(p.sku)}`} className="block">
                <div className="relative aspect-square rounded-md mb-3 bg-gray-100 overflow-hidden">
                  <Image src={p.image || '/logo.png'} alt={p.name} fill className="object-cover" />
                </div>
              </Link>
              <h3 className="font-semibold line-clamp-2">{p.name}</h3>
              <div className="text-sm text-gray-600 mt-1">{p.brand || '—'} · {p.category?.name || '—'}</div>
              <div className="mt-2 font-bold">{p.price.toLocaleString()} {p.currency || 'VND'}</div>
              <div className={`mt-1 text-xs ${p.inStock ? "text-emerald-600" : "text-rose-600"}`}>
                {p.inStock ? "Còn hàng" : "Hết hàng"}
              </div>
              <div className="mt-3 flex gap-2">
                <Link href={`/shop/products/${encodeURIComponent(p.productSlug || '')}/${encodeURIComponent(p.sku)}`} className="flex-1 rounded-md bg-blue-600 text-white py-2 text-sm font-semibold text-center hover:bg-blue-700">
                  Xem chi tiết
                </Link>
                <button className="rounded-md border w-10 h-10 flex items-center justify-center hover:bg-gray-50" aria-label="Thêm vào giỏ" onClick={(e) => handleAdd(p, e.currentTarget)} title="Thêm vào giỏ"><ShoppingCart className="h-4 w-4" /></button>
              </div>
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

