"use client";
import { useEffect, useState } from "react";
import { getJSON, postJSON, del } from "../_lib/fetcher";

type Cate = { id: string; name: string };
type TypeRow = { id: string; slug: string; name: string; categoryId: string; productCount: number; };
type ListResp<T> = { data: T[]; meta: { total: number; page: number; pageSize: number } };

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
  const [form, setForm] = useState({ name: "", slug: "" });

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
            <th className="px-3 py-2 text-left">Tên</th>
            <th className="px-3 py-2 text-left">Slug</th>
            <th className="px-3 py-2">Sản phẩm</th>
            <th className="px-3 py-2"></th>
          </tr></thead>
          <tbody>
            {rows.map(r=>(
              <tr key={r.id} className="border-t">
                <td className="px-3 py-2">{r.name}</td>
                <td className="px-3 py-2 text-gray-500">{r.slug}</td>
                <td className="px-3 py-2 text-center">{r.productCount}</td>
                <td className="px-3 py-2 text-right">
                  <button onClick={async()=>{ await del(`/api/admin/product-types/${r.id}`); triggerReload(); }} className="text-red-600">Xóa</button>
                </td>
              </tr>
            ))}
            {!rows.length && <tr><td className="px-3 py-6 text-center text-gray-500" colSpan={4}>Không có dữ liệu</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="rounded border bg-white p-4 space-y-2">
        <div className="font-semibold">Tạo loại SP</div>
        <div className="grid sm:grid-cols-2 gap-2">
          <input className="border rounded px-3 py-2" placeholder="Name *" value={form.name} onChange={e=>setForm({...form, name:e.target.value})}/>
          <input className="border rounded px-3 py-2" placeholder="Slug (optional)" value={form.slug} onChange={e=>setForm({...form, slug:e.target.value})}/>
        </div>
        <button onClick={async()=>{
          await postJSON(`/api/admin/product-types`, { name: form.name, slug: form.slug || undefined, categoryId });
          setForm({ name:"", slug:"" }); triggerReload();
        }} className="px-3 py-2 rounded bg-green-600 text-white">Tạo</button>
      </div>
    </div>
  );
}
