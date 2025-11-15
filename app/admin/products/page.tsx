"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { getJSON, postJSON } from "../_lib/fetcher";

type Row = {
  id: string;
  name: string;
  sku: string;
  slug: string;
  price: string;
  listPrice?: string | null;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  brand?: { id: string; name: string } | null;
  type?: { id: string; name: string } | null;
  coverImage?: string | null;
  createdAt?: string;
  updatedAt?: string;
  currency?: string | null;
  stockOnHand?: number | null;
  stockReserved?: number | null;
};
type ListResp<T> = { data: T[]; meta: { total: number; page: number; pageSize: number } };
type Option = { id: string; name: string };

const formatDate = (iso?: string) =>
  iso ? new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso)) : "—";
const formatCurrency = (value?: string | number, currency = "VND") => {
  const num = typeof value === "string" ? Number(value) : value ?? 0;
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency, maximumFractionDigits: 0 }).format(num);
};

export default function ProductsPage() {
  const pageSize = 20;
  const [keyword, setKeyword] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [reloadToken, setReloadToken] = useState(0);
  const [types, setTypes] = useState<Option[]>([]);
  const [brands, setBrands] = useState<Option[]>([]);
  const [form, setForm] = useState({
    name: "",
    sku: "",
    slug: "",
    typeId: "",
    brandId: "",
    price: "",
    listPrice: "",
    coverImage: "",
    status: "DRAFT",
    description: "",
  });
  const [creating, setCreating] = useState(false);

  const triggerReload = () => setReloadToken((token) => token + 1);

  useEffect(() => {
    let ignore = false;
    const fetchOptions = async () => {
      const [typesResp, brandsResp] = await Promise.all([
        getJSON<ListResp<Option>>("/api/admin/product-types?page=1&pageSize=200"),
        getJSON<ListResp<Option>>("/api/admin/brands?page=1&pageSize=200"),
      ]);
      if (ignore) return;
      setTypes(typesResp.data);
      setBrands(brandsResp.data);
      setForm((prev) => ({
        ...prev,
        typeId: prev.typeId || typesResp.data[0]?.id || "",
        brandId: prev.brandId || "",
      }));
    };
    fetchOptions();
    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    if (types.length && !form.typeId) {
      setForm((prev) => ({ ...prev, typeId: types[0].id }));
    }
  }, [types, form.typeId]);

  useEffect(() => {
    let ignore = false;
    const fetchProducts = async () => {
      const params = new URLSearchParams({
        q: searchQuery,
        page: String(page),
        pageSize: String(pageSize),
      });
      const json = await getJSON<ListResp<Row>>(`/api/admin/products?${params.toString()}`);
      if (ignore) return;
      setRows(json.data);
      setTotal(json.meta.total);
    };

    fetchProducts();
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

  const handleCreate = async () => {
    if (!form.name.trim() || !form.sku.trim() || !form.typeId) return;
    setCreating(true);
    try {
      await postJSON("/api/admin/products", {
        name: form.name.trim(),
        sku: form.sku.trim(),
        slug: form.slug.trim() || undefined,
        typeId: form.typeId,
        brandId: form.brandId || undefined,
        price: Number(form.price || 0),
        listPrice: form.listPrice ? Number(form.listPrice) : undefined,
        coverImage: form.coverImage || undefined,
        status: form.status as Row["status"],
        description: form.description || undefined,
      });
      setForm({
        name: "",
        sku: "",
        slug: "",
        typeId: types[0]?.id || "",
        brandId: "",
        price: "",
        listPrice: "",
        coverImage: "",
        status: "DRAFT",
        description: "",
      });
      triggerReload();
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input value={keyword} onChange={e=>setKeyword(e.target.value)} placeholder="Tìm sản phẩm..." className="border rounded px-3 py-2"/>
        <button onClick={handleSearch} className="px-3 py-2 rounded bg-blue-600 text-white">Tìm</button>
      </div>

      <div className="rounded border bg-white overflow-hidden">
        <div className="p-3 border-b font-semibold">Sản phẩm ({total})</div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left">Ảnh</th>
              <th className="px-3 py-2 text-left">Tên</th>
              <th className="px-3 py-2 text-left">SKU</th>
              <th className="px-3 py-2 text-left">Loại</th>
              <th className="px-3 py-2 text-left">Thương hiệu</th>
              <th className="px-3 py-2 text-right">Giá</th>
              <th className="px-3 py-2 text-right">Niêm yết</th>
              <th className="px-3 py-2 text-center">Tồn kho</th>
              <th className="px-3 py-2 text-center">Trạng thái</th>
              <th className="px-3 py-2 text-left">Tạo lúc</th>
              <th className="px-3 py-2 text-left">Cập nhật</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id} className="border-t">
                <td className="px-3 py-2">
                  {r.coverImage ? (
                    <div className="relative w-16 h-16 border rounded bg-white overflow-hidden">
                      <Image src={r.coverImage} alt={r.name} fill className="object-cover" />
                    </div>
                  ) : (
                    <div className="w-16 h-16 border rounded bg-gray-50 flex items-center justify-center text-xs text-gray-500">
                      No image
                    </div>
                  )}
                </td>
                <td className="px-3 py-2">
                  <Link href={`/admin/products/${r.id}`} className="text-blue-600 hover:underline">
                    {r.name}
                  </Link>
                </td>
                <td className="px-3 py-2 text-gray-900 font-mono">{r.sku}</td>
                <td className="px-3 py-2">{r.type?.name || "—"}</td>
                <td className="px-3 py-2">{r.brand?.name || "—"}</td>
                <td className="px-3 py-2 text-right">{formatCurrency(r.price, r.currency || "VND")}</td>
                <td className="px-3 py-2 text-right">
                  {r.listPrice ? formatCurrency(r.listPrice, r.currency || "VND") : "—"}
                </td>
                <td className="px-3 py-2 text-center">{r.stockOnHand ?? 0}</td>
                <td className="px-3 py-2 text-center">
                  <span
                    className={`px-2 py-1 text-xs rounded ${
                      r.status === "PUBLISHED"
                        ? "bg-green-100 text-green-700"
                        : r.status === "ARCHIVED"
                        ? "bg-gray-200 text-gray-700"
                        : "bg-yellow-100 text-yellow-700"
                    }`}
                  >
                    {r.status}
                  </span>
                </td>
                <td className="px-3 py-2 text-gray-500">{formatDate(r.createdAt)}</td>
                <td className="px-3 py-2 text-gray-500">{formatDate(r.updatedAt)}</td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td className="px-3 py-6 text-center text-gray-500" colSpan={11}>
                  Không có dữ liệu
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="rounded border bg-white p-4 space-y-4">
        <div className="font-semibold text-lg">Thêm sản phẩm nhanh</div>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Tên *</label>
            <input className="border rounded px-3 py-2" value={form.name} onChange={(e)=>setForm({...form, name:e.target.value})} placeholder="Tên sản phẩm" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">SKU *</label>
            <input className="border rounded px-3 py-2" value={form.sku} onChange={(e)=>setForm({...form, sku:e.target.value})} placeholder="SKU duy nhất" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Slug</label>
            <input className="border rounded px-3 py-2" value={form.slug} onChange={(e)=>setForm({...form, slug:e.target.value})} placeholder="auto tạo nếu bỏ trống" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Loại sản phẩm *</label>
            <select className="border rounded px-3 py-2" value={form.typeId} onChange={(e)=>setForm({...form, typeId:e.target.value})}>
              <option value="">Chọn loại</option>
              {types.map((t)=>(
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Thương hiệu</label>
            <select className="border rounded px-3 py-2" value={form.brandId} onChange={(e)=>setForm({...form, brandId:e.target.value})}>
              <option value="">— Không chọn —</option>
              {brands.map((b)=>(
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Giá *</label>
            <input type="number" min="0" className="border rounded px-3 py-2" value={form.price} onChange={(e)=>setForm({...form, price:e.target.value})} placeholder="Giá bán" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Giá niêm yết</label>
            <input type="number" min="0" className="border rounded px-3 py-2" value={form.listPrice} onChange={(e)=>setForm({...form, listPrice:e.target.value})} placeholder="Có thể bỏ trống" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Ảnh đại diện</label>
            <input className="border rounded px-3 py-2" value={form.coverImage} onChange={(e)=>setForm({...form, coverImage:e.target.value})} placeholder="https://..." />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Trạng thái</label>
            <select className="border rounded px-3 py-2" value={form.status} onChange={(e)=>setForm({...form, status:e.target.value})}>
              <option value="DRAFT">DRAFT</option>
              <option value="PUBLISHED">PUBLISHED</option>
              <option value="ARCHIVED">ARCHIVED</option>
            </select>
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium text-gray-700">Mô tả</label>
            <textarea className="border rounded px-3 py-2 min-h-[120px]" value={form.description} onChange={(e)=>setForm({...form, description:e.target.value})} placeholder="Giới thiệu tổng quan" />
          </div>
        </div>
        {form.coverImage && (
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">Xem thử ảnh:</span>
            <div className="relative w-24 h-24 border rounded bg-white overflow-hidden">
              <Image src={form.coverImage} alt="Preview" fill className="object-cover" />
            </div>
          </div>
        )}
        <button
          onClick={handleCreate}
          className="px-4 py-2 rounded bg-green-600 text-white disabled:opacity-50"
          disabled={!form.name.trim() || !form.sku.trim() || !form.typeId || !form.price || creating}
        >
          {creating ? "Đang tạo..." : "Thêm sản phẩm"}
        </button>
      </div>

      <div className="flex items-center gap-2">
        <button disabled={page<=1} onClick={()=>setPage(p=>Math.max(1, p-1))} className="px-3 py-1 rounded border">Prev</button>
        <div>Trang {page}</div>
        <button disabled={page*pageSize>=total} onClick={()=>setPage(p=>p+1)} className="px-3 py-1 rounded border">Next</button>
      </div>
    </div>
  );
}
