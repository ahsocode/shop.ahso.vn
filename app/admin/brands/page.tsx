"use client";

import { useEffect, useState } from "react";
import { getJSON, postJSON, del } from "../_lib/fetcher";

type Brand = {
  id: string; slug: string; name: string; logoUrl: string | null; summary: string | null; productCount: number;
};
type ListResp = { data: Brand[]; meta: { total: number; page: number; pageSize: number } };

export default function BrandsPage() {
  const pageSize = 20;
  const [keyword, setKeyword] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<Brand[]>([]);
  const [total, setTotal] = useState(0);
  const [form, setForm] = useState({ name: "", slug: "", logoUrl: "", summary: "" });
  const [loading, setLoading] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  const triggerReload = () => setReloadToken((token) => token + 1);

  useEffect(() => {
    let ignore = false;
    const fetchBrands = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          q: searchQuery,
          page: String(page),
          pageSize: String(pageSize),
        });
        const json = await getJSON<ListResp>(`/api/admin/brands?${params.toString()}`);
        if (ignore) return;
        setRows(json.data);
        setTotal(json.meta.total);
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    fetchBrands();
    return () => {
      ignore = true;
    };
  }, [page, pageSize, searchQuery, reloadToken]);

  const handleSearch = () => {
    const term = keyword.trim();
    setPage(1);
    if (term === searchQuery) {
      triggerReload();
    } else {
      setSearchQuery(term);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="Tìm thương hiệu..."
          className="input input-bordered w-full max-w-xs border rounded px-3 py-2"
        />
        <button onClick={handleSearch} className="px-3 py-2 rounded bg-blue-600 text-white">
          Tìm
        </button>
      </div>

      <div className="rounded border bg-white overflow-hidden">
        <div className="p-3 border-b flex items-center justify-between">
          <div className="font-semibold">Thương hiệu ({total})</div>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left">Tên</th>
              <th className="px-3 py-2 text-left">Slug</th>
              <th className="px-3 py-2 text-left">Sản phẩm</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r=>(
              <tr key={r.id} className="border-t">
                <td className="px-3 py-2">{r.name}</td>
                <td className="px-3 py-2 text-gray-500">{r.slug}</td>
                <td className="px-3 py-2">{r.productCount}</td>
                <td className="px-3 py-2 text-right">
                  <button
                    onClick={async () => {
                      await del(`/api/admin/brands/${r.id}`);
                      triggerReload();
                    }}
                    className="text-red-600"
                  >
                    Xóa
                  </button>
                </td>
              </tr>
            ))}
            {!rows.length && !loading && <tr><td className="px-3 py-6 text-center text-gray-500" colSpan={4}>Không có dữ liệu</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-2">
        <button
          disabled={page <= 1}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          className="px-3 py-1 rounded border"
        >
          Prev
        </button>
        <div>Trang {page}</div>
        <button
          disabled={page * pageSize >= total}
          onClick={() => setPage((p) => p + 1)}
          className="px-3 py-1 rounded border"
        >
          Next
        </button>
      </div>

      <div className="rounded border bg-white p-4 space-y-2">
        <div className="font-semibold">Tạo thương hiệu</div>
        <div className="grid sm:grid-cols-2 gap-2">
          <input className="border rounded px-3 py-2" placeholder="Name *" value={form.name} onChange={e=>setForm({...form, name:e.target.value})}/>
          <input className="border rounded px-3 py-2" placeholder="Slug (optional)" value={form.slug} onChange={e=>setForm({...form, slug:e.target.value})}/>
          <input className="border rounded px-3 py-2" placeholder="Logo URL" value={form.logoUrl} onChange={e=>setForm({...form, logoUrl:e.target.value})}/>
          <input className="border rounded px-3 py-2" placeholder="Summary" value={form.summary} onChange={e=>setForm({...form, summary:e.target.value})}/>
        </div>
        <button
          onClick={async()=>{
            await postJSON("/api/admin/brands", { ...form, logoUrl: form.logoUrl || undefined, summary: form.summary || undefined, slug: form.slug || undefined });
            setForm({ name:"", slug:"", logoUrl:"", summary:"" });
            triggerReload();
          }}
          className="px-3 py-2 rounded bg-green-600 text-white"
        >Tạo</button>
      </div>
    </div>
  );
}
