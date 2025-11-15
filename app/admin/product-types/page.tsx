"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import { getJSON, postJSON, del, patchJSON } from "../_lib/fetcher";

type Cate = { id: string; name: string };
type TypeRow = {
  id: string;
  slug: string;
  name: string;
  categoryId: string;
  categoryName: string;
  productCount: number;
  coverImage: string | null;
  description: string | null;
  createdAt: string;
  updatedAt: string;
};
type ListResp<T> = { data: T[]; meta: { total: number; page: number; pageSize: number } };

const formatDate = (iso: string) =>
  new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(iso),
  );

export default function ProductTypesPage() {
  const pageSize = 20;
  const [categories, setCategories] = useState<Cate[]>([]);
  const [categoryId, setCategoryId] = useState<string>("");
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<TypeRow[]>([]);
  const [total, setTotal] = useState(0);
  const [reloadToken, setReloadToken] = useState(0);
  const [form, setForm] = useState({ name: "", slug: "", coverImage: "", description: "" });
  const [editing, setEditing] = useState<TypeRow | null>(null);
  const [editForm, setEditForm] = useState({ name: "", slug: "", coverImage: "", description: "" });

  const triggerReload = () => setReloadToken((token) => token + 1);

  useEffect(() => {
    let ignore = false;
    const fetchCategories = async () => {
      const json = await getJSON<ListResp<Cate>>(`/api/admin/categories?page=1&pageSize=999`);
      if (ignore) return;
      const mapped = json.data.map((c) => ({ id: c.id, name: c.name }));
      setCategories(mapped);
      setCategoryId((prev) => prev || mapped[0]?.id || "");
    };
    fetchCategories();
    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    if (!categoryId) return;
    let ignore = false;
    const fetchTypes = async () => {
      const params = new URLSearchParams({
        categoryId,
        q: searchQuery,
        page: String(page),
        pageSize: String(pageSize),
      });
      const json = await getJSON<ListResp<TypeRow>>(`/api/admin/product-types?${params.toString()}`);
      if (ignore) return;
      setRows(json.data);
      setTotal(json.meta.total);
    };
    fetchTypes();
    return () => {
      ignore = true;
    };
  }, [categoryId, page, pageSize, searchQuery, reloadToken]);

  const handleSearch = () => {
    const term = searchInput.trim();
    setPage(1);
    if (term === searchQuery) {
      triggerReload();
    } else {
      setSearchQuery(term);
    }
  };

  const handleCategoryChange = (value: string) => {
    setCategoryId(value);
    setPage(1);
    triggerReload();
  };

  const openEdit = (row: TypeRow) => {
    setEditing(row);
    setEditForm({
      name: row.name,
      slug: row.slug,
      coverImage: row.coverImage || "",
      description: row.description || "",
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 items-center">
        <select value={categoryId} onChange={e=>handleCategoryChange(e.target.value)} className="border rounded px-3 py-2">
          {categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <input value={searchInput} onChange={e=>setSearchInput(e.target.value)} placeholder="Tìm loại SP..." className="border rounded px-3 py-2" />
        <button onClick={handleSearch} className="px-3 py-2 rounded bg-blue-600 text-white">Tìm</button>
      </div>

      <div className="rounded border bg-white overflow-hidden">
        <div className="p-3 border-b font-semibold">Loại sản phẩm ({total})</div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50"><tr>
            <th className="px-3 py-2 text-left">Ảnh</th>
            <th className="px-3 py-2 text-left">Tên</th>
            <th className="px-3 py-2 text-left">Slug</th>
            <th className="px-3 py-2 text-left">Danh mục</th>
            <th className="px-3 py-2 text-left max-w-md">Mô tả</th>
            <th className="px-3 py-2 text-center">Sản phẩm</th>
            <th className="px-3 py-2 text-left">Tạo lúc</th>
            <th className="px-3 py-2 text-left">Cập nhật</th>
            <th className="px-3 py-2"></th>
          </tr></thead>
          <tbody>
            {rows.map(r=>(
              <tr key={r.id} className="border-t">
                <td className="px-3 py-2">
                  {r.coverImage ? (
                    <div className="relative w-16 h-16 rounded border bg-white overflow-hidden">
                      <Image src={r.coverImage} alt={r.name} fill className="object-cover" />
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded border bg-gray-50 flex items-center justify-center text-xs text-gray-500">
                      No image
                    </div>
                  )}
                </td>
                <td className="px-3 py-2 font-semibold">{r.name}</td>
                <td className="px-3 py-2 text-gray-500 font-mono">{r.slug}</td>
                <td className="px-3 py-2 text-gray-700">{r.categoryName || "-"} </td>
                <td className="px-3 py-2 max-w-md text-gray-700">
                  <span className="line-clamp-2" title={r.description || undefined}>{r.description || "—"}</span>
                </td>
                <td className="px-3 py-2 text-center">{r.productCount}</td>
                <td className="px-3 py-2 text-gray-500">{formatDate(r.createdAt)}</td>
                <td className="px-3 py-2 text-gray-500">{formatDate(r.updatedAt)}</td>
                <td className="px-3 py-2 text-right space-x-3">
                  <button onClick={()=>openEdit(r)} className="text-blue-600 hover:underline">Sửa</button>
                  <button onClick={async()=>{ await del(`/api/admin/product-types/${r.id}`); triggerReload(); }} className="text-red-600">Xóa</button>
                </td>
              </tr>
            ))}
            {!rows.length && <tr><td className="px-3 py-6 text-center text-gray-500" colSpan={4}>Không có dữ liệu</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="rounded border bg-white p-4 space-y-4">
        <div className="font-semibold text-lg">Tạo loại sản phẩm</div>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Tên loại *</label>
            <input className="border rounded px-3 py-2" placeholder="Ví dụ: Máy CNC" value={form.name} onChange={e=>setForm({...form, name:e.target.value})}/>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Slug (tùy chọn)</label>
            <input className="border rounded px-3 py-2" placeholder="tự tạo nếu bỏ trống" value={form.slug} onChange={e=>setForm({...form, slug:e.target.value})}/>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Ảnh minh họa</label>
            <input className="border rounded px-3 py-2" placeholder="https://..." value={form.coverImage} onChange={e=>setForm({...form, coverImage:e.target.value})}/>
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium text-gray-700">Mô tả</label>
            <textarea className="border rounded px-3 py-2 min-h-[120px]" placeholder="Giới thiệu về loại sản phẩm..." value={form.description} onChange={e=>setForm({...form, description:e.target.value})}/>
          </div>
        </div>
        {form.coverImage && (
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">Xem thử ảnh:</span>
            <div className="relative w-24 h-24 border rounded bg-white overflow-hidden">
              <Image src={form.coverImage} alt="Cover preview" fill className="object-cover" />
            </div>
          </div>
        )}
        <button onClick={async()=>{
          await postJSON(`/api/admin/product-types`, {
            name: form.name,
            slug: form.slug || undefined,
            categoryId,
            coverImage: form.coverImage || undefined,
            description: form.description || undefined,
          });
          setForm({ name:"", slug:"", coverImage:"", description:"" }); triggerReload();
        }} className="px-3 py-2 rounded bg-green-600 text-white disabled:opacity-50" disabled={!form.name.trim()}>Tạo</button>
      </div>
      {editing && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-lg space-y-4 p-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-lg">Chỉnh sửa loại sản phẩm</h2>
              <button onClick={()=>setEditing(null)} className="text-sm text-gray-500 hover:text-gray-700">Đóng</button>
            </div>
            <div className="space-y-3">
              <input className="border rounded px-3 py-2" value={editForm.name} onChange={(e)=>setEditForm({...editForm, name:e.target.value})} placeholder="Tên" />
              <input className="border rounded px-3 py-2" value={editForm.slug} onChange={(e)=>setEditForm({...editForm, slug:e.target.value})} placeholder="Slug" />
              <input className="border rounded px-3 py-2" value={editForm.coverImage} onChange={(e)=>setEditForm({...editForm, coverImage:e.target.value})} placeholder="Ảnh" />
              <textarea className="border rounded px-3 py-2 min-h-[100px]" value={editForm.description} onChange={(e)=>setEditForm({...editForm, description:e.target.value})} placeholder="Mô tả" />
            </div>
            <div className="flex justify-end gap-2">
              <button className="px-3 py-2 rounded border" onClick={()=>setEditing(null)}>Hủy</button>
              <button
                onClick={async()=>{
                  await patchJSON(`/api/admin/product-types/${editing.id}`, {
                    name: editForm.name,
                    slug: editForm.slug || undefined,
                    coverImage: editForm.coverImage || undefined,
                    description: editForm.description || undefined,
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
