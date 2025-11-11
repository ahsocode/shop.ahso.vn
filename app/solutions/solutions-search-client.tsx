"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import Link from "next/link";
import Image from "next/image";
import FilterLayout from "../shop/filterlayout";


export type Solution = {
  id: string;
  title: string; 
  slug: string;
  industry?: string; 
  type?: string | null; 
  usecase?: string | null; 
  coverImage?: string | null;
};

const INDUSTRIES = [
  { value: "", label: "Tất cả ngành" },
  { value: "food", label: "Thực phẩm" },
  { value: "auto", label: "Ô tô" },
  { value: "electronics", label: "Điện tử" },
  { value: "other", label: "Khác" },
];

export default function SolutionsSearchClient() {
  const router = useRouter();
  const sp = useSearchParams();

  const [q, setQ] = useState(sp.get("q") ?? "");
  const [industry, setIndustry] = useState(sp.get("industry") ?? "");
  const [usecase, setUsecase] = useState(sp.get("usecase") ?? "");
  const [page, setPage] = useState(Number(sp.get("page") ?? "1"));

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<Solution[]>([]);
  const [total, setTotal] = useState(0);
  const pageSize = 12;

  const params = useMemo(() => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (industry) p.set("industry", industry);
    if (usecase) p.set("usecase", usecase);
    p.set("page", String(page));
    p.set("pageSize", String(pageSize));
    return p;
  }, [q, industry, usecase, page]);

  useEffect(() => {
  const url = `/api/search/solutions?${params.toString()}`;
  router.replace(`/solutions?${params.toString()}`, { scroll: false });

  let aborted = false;
  const controller = new AbortController();

  async function run() {
    setLoading(true);
    try {
      const r = await fetch(url, {
        signal: controller.signal,
        headers: { Accept: "application/json" },
        cache: "no-store",
      });

      // Nếu lỗi HTTP (500/404/…): đừng parse JSON
      if (!r.ok) {
        if (!aborted) {
          setData([]);
          setTotal(0);
        }
        return;
      }

      // Đọc text rồi tự parse để tránh "Unexpected end of JSON input"
      const text = await r.text();
      if (!text || !text.trim()) {
        if (!aborted) {
          setData([]);
          setTotal(0);
        }
        return;
      }

      let json: any;
      try {
        json = JSON.parse(text);
      } catch {
        // Server có thể trả HTML (<!DOCTYPE …>) khi 500
        if (!aborted) {
          setData([]);
          setTotal(0);
        }
        return;
      }

      if (!aborted) {
        setData((json.data ?? []) as Solution[]);
        setTotal(json.meta?.total ?? 0);
      }
    } catch (err: any) {
      // Abort / network error → coi như rỗng
      if (!aborted) {
        setData([]);
        setTotal(0);
      }
    } finally {
      if (!aborted) setLoading(false);
    }
  }

  run();

  return () => {
    aborted = true;
    controller.abort(); // hủy request cũ khi user tiếp tục gõ
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [params, router]);


  useEffect(() => { setPage(1); }, [q, industry, usecase]);

  const pages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <FilterLayout
      searchBar={
        <div className="relative">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tìm giải pháp theo tên/bài toán…"
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
          <h3 className="font-semibold mb-4">Bộ lọc (Giải pháp)</h3>

          <label className="block text-sm font-medium mb-1">Ngành</label>
          <select className="w-full border rounded-md px-3 py-2 mb-4" value={industry} onChange={(e) => setIndustry(e.target.value)}>
            {INDUSTRIES.map((i) => <option key={i.value} value={i.value}>{i.label}</option>)}
          </select>

          <label className="block text-sm font-medium mb-1">Bài toán / Use case</label>
          <input
            value={usecase}
            onChange={(e) => setUsecase(e.target.value)}
            placeholder="VD: packaging, assembly…"
            className="w-full border rounded-md px-3 py-2 mb-4"
          />

          <button onClick={() => { setQ(""); setIndustry(""); setUsecase(""); }} className="w-full rounded-md border px-3 py-2 text-sm">
            Xóa bộ lọc
          </button>
        </>
      }
      topInfo={
        <div className="text-sm text-gray-600">
          {loading ? "Đang tải..." : `Tìm thấy ${total} giải pháp`}
        </div>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 min-h-60">
        {loading && data.length === 0 ? (
          <div className="col-span-full text-center text-sm text-gray-600">Đang tải…</div>
        ) : data.length === 0 ? (
          <div className="col-span-full text-center text-sm text-gray-600">Không có kết quả</div>
        ) : (
          data.map((s) => (
            <article
              key={s.id}
              className="border rounded-xl p-4 bg-white shadow-sm hover:shadow-md transition flex flex-col h-full"
            >
              
              <Link href={`/solutions/${encodeURIComponent(s.slug)}`} className="block">
                {s.coverImage ? (
                  <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-gray-100">
                    <Image
                      src={s.coverImage}
                      alt={s.title}
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
                <h3 className="font-semibold line-clamp-2">{s.title}</h3>

                <dl className="mt-2 text-sm text-gray-700 space-y-1">
                  <div className="flex gap-2">
                    <dt className="text-gray-500 min-w-14">Ngành</dt>
                    <dd className="flex-1 truncate">{s.industry || "—"}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="text-gray-500 min-w-14">Loại</dt>
                    <dd className="flex-1 truncate">{s.type || s.usecase || "—"}</dd>
                  </div>
                </dl>

              
                <div className="mt-auto pt-3">
                  <Link
                    href={`/solutions/${encodeURIComponent(s.slug)}`}
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