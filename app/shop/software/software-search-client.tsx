"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import FilterLayout from "../filterlayout";

type Software = { id: string; name: string; services: string[]; stack: string[] };

const SERVICES = [
  { value: "", label: "Tất cả dịch vụ" },
  { value: "implementation", label: "Triển khai" },
  { value: "integration", label: "Tích hợp" },
  { value: "maintenance", label: "Bảo trì" },
  { value: "training", label: "Đào tạo" },
];
const STACKS = ["MES", "ERP", "CMMS", "SCADA"];

export default function SoftwareSearchClient() {
  const router = useRouter();
  const sp = useSearchParams();

  const [q, setQ] = useState(sp.get("q") ?? "");
  const [service, setService] = useState(sp.get("service") ?? "");
  const [stack, setStack] = useState(sp.get("stack") ?? "");
  const [page, setPage] = useState(Number(sp.get("page") ?? "1"));

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<Software[]>([]);
  const [total, setTotal] = useState(0);
  const pageSize = 12;

  const params = useMemo(() => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (service) p.set("service", service);
    if (stack) p.set("stack", stack);
    p.set("page", String(page));
    p.set("pageSize", String(pageSize));
    return p;
  }, [q, service, stack, page]);

  useEffect(() => {
    const url = `/api/search/software?${params.toString()}`;
    router.replace(`/shop/software?${params.toString()}`, { scroll: false });

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

  useEffect(() => { setPage(1); }, [q, service, stack]);

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
          <h3 className="font-semibold mb-4">Bộ lọc (Phần mềm & Dịch vụ)</h3>

          <label className="block text-sm font-medium mb-1">Loại dịch vụ</label>
          <select className="w-full border rounded-md px-3 py-2 mb-4" value={service} onChange={(e) => setService(e.target.value)}>
            {SERVICES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>

          <label className="block text-sm font-medium mb-1">Nền tảng</label>
          <select className="w-full border rounded-md px-3 py-2 mb-4" value={stack} onChange={(e) => setStack(e.target.value)}>
            <option value="">Tất cả nền tảng</option>
            {STACKS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>

          <button onClick={() => { setQ(""); setService(""); setStack(""); }} className="w-full rounded-md border px-3 py-2 text-sm">
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
            <article key={x.id} className="border rounded-xl p-4 bg-white shadow-sm hover:shadow-md transition">
              <h3 className="font-semibold">{x.name}</h3>
              <div className="text-sm text-gray-600 mt-1">
                Dịch vụ: {x.services.join(", ")} • Nền tảng: {x.stack.join(", ")}
              </div>
              <button className="mt-3 rounded-md bg-blue-600 text-white px-4 py-2 text-sm font-semibold hover:bg-blue-700">
                Xem chi tiết
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