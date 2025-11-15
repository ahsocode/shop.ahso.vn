"use client";
import { useEffect, useState } from "react";
import { getJSON, postJSON, del } from "../_lib/fetcher";

type Row = { id: string; name: string; slug: string; };
type ListResp = { data: Row[]; meta: { total: number; page: number; pageSize: number } };

export default function SpecsPage() {
  const pageSize = 20;
  const [keyword, setKeyword] = useState(""); const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<Row[]>([]); const [total, setTotal] = useState(0);
  const [form, setForm] = useState({ name: "", slug: "" });
  const [reloadToken, setReloadToken] = useState(0);

  const triggerReload = () => setReloadToken((token) => token + 1);

  useEffect(() => {
    let ignore = false;
    const fetchSpecs = async () => {
      const params = new URLSearchParams({
        q: searchQuery,
        page: String(page),
        pageSize: String(pageSize),
      });
      const json = await getJSON<ListResp>(`/api/admin/spec-defs?${params.toString()}`);
      if (ignore) return;
      setRows(json.data); setTotal(json.meta.total);
    };
    fetchSpecs();
    return () => { ignore = true; };
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
        <input value={keyword} onChange={e=>setKeyword(e.target.value)} placeholder="Tìm thông số..." className="border rounded px-3 py-2"/>
        <button onClick={handleSearch} className="px-3 py-2 rounded bg-blue-600 text-white">Tìm</button>
      </div>

      <div className="rounded border bg-white overflow-hidden">
        <div className="p-3 border-b font-semibold">Thông số ({total})</div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50"><tr>
            <th className="px-3 py-2 text-left">Tên</th>
            <th className="px-3 py-2 text-left">Slug</th>
            <th className="px-3 py-2"></th>
          </tr></thead>
          <tbody>
            {rows.map(r=>(
              <tr key={r.id} className="border-t">
                <td className="px-3 py-2">{r.name}</td>
                <td className="px-3 py-2 text-gray-500">{r.slug}</td>
                <td className="px-3 py-2 text-right">
                  <button onClick={async()=>{ await del(`/api/admin/spec-defs/${r.id}`); triggerReload(); }} className="text-red-600">Xóa</button>
                </td>
              </tr>
            ))}
            {!rows.length && <tr><td className="px-3 py-6 text-center text-gray-500" colSpan={3}>Không có dữ liệu</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="rounded border bg-white p-4 space-y-2">
        <div className="font-semibold">Tạo thông số</div>
        <div className="grid sm:grid-cols-2 gap-2">
          <input className="border rounded px-3 py-2" placeholder="Name *" value={form.name} onChange={e=>setForm({...form, name:e.target.value})}/>
          <input className="border rounded px-3 py-2" placeholder="Slug (optional)" value={form.slug} onChange={e=>setForm({...form, slug:e.target.value})}/>
        </div>
        <button onClick={async()=>{
          await postJSON("/api/admin/spec-defs", { name: form.name, slug: form.slug || undefined });
          setForm({ name:"", slug:"" }); triggerReload();
        }} className="px-3 py-2 rounded bg-green-600 text-white">Tạo</button>
      </div>
    </div>
  );
}
