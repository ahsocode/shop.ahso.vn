"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import FilterLayout from "../filterlayout";

type Software = { id: string; slug: string; title: string; image?: string | null; summary?: string | null };
type Category = { id: string; slug: string; name: string };

export default function SoftwareSearchClient() {
  const router = useRouter();
  const sp = useSearchParams();

  const [q, setQ] = useState(sp.get("q") ?? "");
  const [page, setPage] = useState(Number(sp.get("page") ?? "1"));
  const [category, setCategory] = useState(sp.get("category") ?? "");

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<Software[]>([]);
  const [total, setTotal] = useState(0);
  const [categories, setCategories] = useState<Category[]>([]);
  const pageSize = 12;

  const params = useMemo(() => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (category) p.set("category", category);
    p.set("page", String(page));
    p.set("pageSize", String(pageSize));
    return p;
  }, [q, category, page]);

  useEffect(() => {
    const url = `/api/software?${params.toString()}`;
    router.replace(`/software?${params.toString()}`, { scroll: false });

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

  useEffect(() => { setPage(1); }, [q, category]);

  // Load categories once
  useEffect(() => {
    let aborted = false;
    fetch("/api/software/categories")
      .then((r) => r.json())
      .then((json) => { if (!aborted) setCategories(json.data ?? []); })
      .catch(() => { if (!aborted) setCategories([]); });
    return () => { aborted = true; };
  }, []);

  const pages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <FilterLayout
      searchBar={
        <div className="relative">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tìm phần mềm / dịch vụ…"
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
          <h3 className="font-semibold mb-4">Bộ lọc (Phần mềm)</h3>

          <label className="block text-sm font-medium mb-1">Danh mục</label>
          <select
            className="w-full border rounded-md px-3 py-2 mb-4"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">Tất cả danh mục</option>
            {categories.map((c) => (
              <option key={c.slug} value={c.slug}>{c.name}</option>
            ))}
          </select>

          <button
            onClick={() => { setQ(""); setCategory(""); }}
            className="w-full rounded-md border px-3 py-2 text-sm"
          >
            Xóa bộ lọc
          </button>
        </>
      }
      topInfo={
        <div className="text-sm text-gray-600">
          {loading ? "Đang tải..." : `Tìm thấy ${total} kết quả`}
        </div>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 min-h-60">
        {loading && data.length === 0 ? (
          <div className="col-span-full text-center text-sm text-gray-600">Đang tải…</div>
        ) : data.length === 0 ? (
          <div className="col-span-full text-center text-sm text-gray-600">Không có kết quả</div>
        ) : (
          data.map((x) => (
            <article
              key={x.id}
              className="border rounded-xl p-4 bg-white shadow-sm hover:shadow-md transition flex flex-col h-full"
            >
              <Link href={`/software/${encodeURIComponent(x.slug)}`} className="block">
                {x.image ? (
                  <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-gray-100">
                    <Image
                      src={x.image}
                      alt={x.title}
                      fill
                      className="object-cover"
                      sizes="(min-width: 1280px) 33vw, (min-width: 640px) 50vw, 100vw"
                    />
                  </div>
                ) : (
                  <div className="aspect-video w-full rounded-lg bg-gray-100" />
                )}
              </Link>

              <div className="mt-3 flex-1 flex flex-col">
                <h3 className="font-semibold line-clamp-2">{x.title}</h3>
                {x.summary && <p className="text-sm text-gray-600 mt-1 line-clamp-2">{x.summary}</p>}
                <div className="mt-auto pt-3">
                  <Link
                    href={`/software/${encodeURIComponent(x.slug)}`}
                    className="inline-flex items-center justify-center w-full rounded-md bg-blue-600 text-white px-4 py-2 text-sm font-semibold hover:bg-blue-700"
                  >
                    Xem chi tiết
                  </Link>
                </div>
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
