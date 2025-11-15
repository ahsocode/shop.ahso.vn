"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { getJSON, postJSON, del, patchJSON } from "../_lib/fetcher";

type Brand = {
  id: string;
  slug: string;
  name: string;
  logoUrl: string | null;
  summary: string | null;
  productCount: number;
  createdAt: string;
  updatedAt: string;
};
type ListResp = { data: Brand[]; meta: { total: number; page: number; pageSize: number } };

const formatDate = (iso: string) =>
  new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(iso),
  );

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
  const [editing, setEditing] = useState<Brand | null>(null);
  const [editForm, setEditForm] = useState({ name: "", slug: "", logoUrl: "", summary: "" });

  const triggerReload = () => setReloadToken((token) => token + 1);
  const openEdit = (row: Brand) => {
    setEditing(row);
    setEditForm({
      name: row.name,
      slug: row.slug,
      logoUrl: row.logoUrl || "",
      summary: row.summary || "",
    });
  };

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
              <th className="px-3 py-2 text-left">Logo</th>
              <th className="px-3 py-2 text-left">Tên</th>
              <th className="px-3 py-2 text-left">Slug</th>
              <th className="px-3 py-2 text-left max-w-md">Mô tả</th>
              <th className="px-3 py-2 text-left">Sản phẩm</th>
              <th className="px-3 py-2 text-left">Tạo lúc</th>
              <th className="px-3 py-2 text-left">Cập nhật</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r=>(
              <tr key={r.id} className="border-t">
                <td className="px-3 py-2">
                  {r.logoUrl ? (
                    <div className="relative w-16 h-16 rounded border bg-white overflow-hidden">
                      <Image src={r.logoUrl} alt={r.name} fill className="object-contain" />
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded border bg-gray-50 flex items-center justify-center text-xs text-gray-500">
                      No logo
                    </div>
                  )}
                </td>
                <td className="px-3 py-2 font-semibold">{r.name}</td>
                <td className="px-3 py-2 text-gray-500 font-mono">{r.slug}</td>
                <td className="px-3 py-2 max-w-md text-gray-700">
                  <span className="line-clamp-2" title={r.summary || undefined}>
                    {r.summary || "—"}
                  </span>
                </td>
                <td className="px-3 py-2">{r.productCount}</td>
                <td className="px-3 py-2 text-gray-500">{formatDate(r.createdAt)}</td>
                <td className="px-3 py-2 text-gray-500">{formatDate(r.updatedAt)}</td>
                <td className="px-3 py-2 text-right space-x-3">
                  <button onClick={() => openEdit(r)} className="text-blue-600 hover:underline">Sửa</button>
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

      <div className="rounded border bg-white p-4 space-y-4">
        <div className="font-semibold text-lg">Tạo thương hiệu</div>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Tên thương hiệu *</label>
            <input className="border rounded px-3 py-2" placeholder="VD: AHSO" value={form.name} onChange={e=>setForm({...form, name:e.target.value})}/>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Slug (tùy chọn)</label>
            <input className="border rounded px-3 py-2" placeholder="auto tạo nếu bỏ trống" value={form.slug} onChange={e=>setForm({...form, slug:e.target.value})}/>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Logo URL</label>
            <input className="border rounded px-3 py-2" placeholder="https://..." value={form.logoUrl} onChange={e=>setForm({...form, logoUrl:e.target.value})}/>
          </div>
          <div className="space-y-2 md:row-span-2">
            <label className="text-sm font-medium text-gray-700">Giới thiệu ngắn</label>
            <textarea className="border rounded px-3 py-2 h-full min-h-[120px]" placeholder="Tóm tắt sản phẩm, lĩnh vực..." value={form.summary} onChange={e=>setForm({...form, summary:e.target.value})}/>
          </div>
        </div>
        {form.logoUrl && (
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-600">Xem thử logo:</div>
            <div className="relative w-20 h-20 border rounded bg-white overflow-hidden">
              <Image src={form.logoUrl} alt="Logo preview" fill className="object-contain" />
            </div>
          </div>
        )}
        <button
          onClick={async()=>{
            await postJSON("/api/admin/brands", { ...form, logoUrl: form.logoUrl || undefined, summary: form.summary || undefined, slug: form.slug || undefined });
            setForm({ name:"", slug:"", logoUrl:"", summary:"" });
            triggerReload();
          }}
          className="px-3 py-2 rounded bg-green-600 text-white disabled:opacity-50"
          disabled={!form.name.trim()}
        >
          Tạo thương hiệu
        </button>
      </div>
      {editing && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-lg space-y-4 p-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-lg">Chỉnh sửa thương hiệu</h2>
              <button onClick={() => setEditing(null)} className="text-sm text-gray-500 hover:text-gray-700">Đóng</button>
            </div>
            <div className="space-y-3">
              <input className="border rounded px-3 py-2 w-full" value={editForm.name} onChange={(e)=>setEditForm({...editForm, name:e.target.value})} placeholder="Tên" />
              <input className="border rounded px-3 py-2 w-full" value={editForm.slug} onChange={(e)=>setEditForm({...editForm, slug:e.target.value})} placeholder="Slug" />
              <input className="border rounded px-3 py-2 w-full" value={editForm.logoUrl} onChange={(e)=>setEditForm({...editForm, logoUrl:e.target.value})} placeholder="Logo URL" />
              <textarea className="border rounded px-3 py-2 w-full min-h-[100px]" value={editForm.summary} onChange={(e)=>setEditForm({...editForm, summary:e.target.value})} placeholder="Giới thiệu" />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setEditing(null)} className="px-3 py-2 rounded border">Hủy</button>
              <button
                onClick={async () => {
                  await patchJSON(`/api/admin/brands/${editing.id}`, {
                    name: editForm.name,
                    slug: editForm.slug || undefined,
                    logoUrl: editForm.logoUrl || undefined,
                    summary: editForm.summary || undefined,
                  });
                  setEditing(null);
                  triggerReload();
                }}
                className="px-3 py-2 rounded bg-blue-600 text-white"
              >
                Lưu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
