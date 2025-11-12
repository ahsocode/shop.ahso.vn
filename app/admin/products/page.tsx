"use client";
import { useEffect, useState } from "react";
import { getJSON } from "../_lib/fetcher";

type Row = {
  id: string; name: string; sku: string; slug: string;
  price: string; status: "DRAFT"|"PUBLISHED"|"ARCHIVED";
  brand?: { id: string; name: string } | null;
  type?: { id: string; name: string } | null;
};
type ListResp = { data: Row[]; meta: { total: number; page: number; pageSize: number } };

export default function ProductsPage() {
  const [q, setQ] = useState(""); const [page, setPage] = useState(1);
  const [rows, setRows] = useState<Row[]>([]); const [total, setTotal] = useState(0);

  const load = async () => {
    const url = `/api/admin/products?q=${encodeURIComponent(q)}&page=${page}&pageSize=20`;
    const json = await getJSON<ListResp>(url);
    setRows(json.data); setTotal(json.meta.total);
  };
  useEffect(()=>{ load(); /* eslint-disable-next-line */}, [page]);

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Tìm sản phẩm..." className="border rounded px-3 py-2"/>
        <button onClick={()=>{ setPage(1); load(); }} className="px-3 py-2 rounded bg-blue-600 text-white">Tìm</button>
      </div>

      <div className="rounded border bg-white overflow-hidden">
        <div className="p-3 border-b font-semibold">Sản phẩm ({total})</div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50"><tr>
            <th className="px-3 py-2 text-left">Tên</th>
            <th className="px-3 py-2 text-left">SKU</th>
            <th className="px-3 py-2 text-left">Loại</th>
            <th className="px-3 py-2 text-left">Thương hiệu</th>
            <th className="px-3 py-2 text-right">Giá</th>
            <th className="px-3 py-2 text-center">Trạng thái</th>
          </tr></thead>
          <tbody>
            {rows.map(r=>(
              <tr key={r.id} className="border-t">
                <td className="px-3 py-2">{r.name}</td>
                <td className="px-3 py-2">{r.sku}</td>
                <td className="px-3 py-2">{r.type?.name || "-"}</td>
                <td className="px-3 py-2">{r.brand?.name || "-"}</td>
                <td className="px-3 py-2 text-right">{r.price}</td>
                <td className="px-3 py-2 text-center">
                  <span className="px-2 py-1 text-xs rounded bg-gray-100">{r.status}</span>
                </td>
              </tr>
            ))}
            {!rows.length && <tr><td className="px-3 py-6 text-center text-gray-500" colSpan={6}>Không có dữ liệu</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-2">
        <button disabled={page<=1} onClick={()=>setPage(p=>p-1)} className="px-3 py-1 rounded border">Prev</button>
        <div>Trang {page}</div>
        <button disabled={page*20>=total} onClick={()=>setPage(p=>p+1)} className="px-3 py-1 rounded border">Next</button>
      </div>
    </div>
  );
}
