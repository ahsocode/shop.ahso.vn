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
  costPrice?: string | null;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  brand?: { id: string; name: string } | null;
  type?: { id: string; name: string } | null;
  supplier?: { id: string; name: string } | null;
  supplierSku?: string | null;
  requiresQuote?: boolean | null;
  quoteNote?: string | null;
  coverImage?: string | null;
  createdAt?: string;
  updatedAt?: string;
  currency?: string | null;
  stockOnHand?: number | null;
  stockReserved?: number | null;
  reorderLevel?: number | null;
  reorderQty?: number | null;
  minOrderQty?: number | null;
  stepQty?: number | null;
  taxRate?: string | null;
  taxIncluded?: boolean | null;
};
type ListResp<T> = { data: T[]; meta: { total: number; page: number; pageSize: number } };
type Option = { id: string; name: string };

const formatDate = (iso?: string) =>
  iso ? new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso)) : "—";
const formatCurrency = (value?: string | number, currency = "VND") => {
  const num = typeof value === "string" ? Number(value) : value ?? 0;
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency, maximumFractionDigits: 0 }).format(num);
};

const toNumberOrNull = (value?: string | number | null) => {
  if (value === null || value === undefined) return null;
  const num = typeof value === "string" ? Number(value) : value;
  return Number.isFinite(num) ? num : null;
};

const DEFAULT_FORM = {
  name: "",
  sku: "",
  slug: "",
  typeId: "",
  brandId: "",
  supplierId: "",
  supplierSku: "",
  price: "",
  listPrice: "",
  costPrice: "",
  currency: "VND",
  requiresQuote: false,
  quoteNote: "",
  coverImage: "",
  status: "DRAFT",
  description: "",
  taxRate: "0.10",
  taxIncluded: true,
  stockOnHand: "",
  reorderLevel: "",
  reorderQty: "",
  minOrderQty: "",
  stepQty: "",
};
type FormState = typeof DEFAULT_FORM;

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
  const [suppliers, setSuppliers] = useState<Option[]>([]);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [creating, setCreating] = useState(false);

  const triggerReload = () => setReloadToken((token) => token + 1);

  useEffect(() => {
    let ignore = false;
    const fetchOptions = async () => {
      const [typesResp, brandsResp, supplierResp] = await Promise.all([
        getJSON<ListResp<Option>>("/api/admin/product-types?page=1&pageSize=200"),
        getJSON<ListResp<Option>>("/api/admin/brands?page=1&pageSize=200"),
        getJSON<ListResp<{ id: string; name: string }>>("/api/admin/suppliers?page=1&pageSize=200"),
      ]);
      if (ignore) return;
      setTypes(typesResp.data);
      setBrands(brandsResp.data);
      setSuppliers(supplierResp.data);
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
    if (!form.requiresQuote && !form.price) return;
    setCreating(true);
    try {
      const parseNumber = (value: string) => {
        const trimmed = value.trim();
        if (!trimmed) return undefined;
        const num = Number(trimmed);
        return Number.isFinite(num) ? num : undefined;
      };
      await postJSON("/api/admin/products", {
        name: form.name.trim(),
        sku: form.sku.trim(),
        slug: form.slug.trim() || undefined,
        typeId: form.typeId,
        brandId: form.brandId || undefined,
        supplierId: form.supplierId || undefined,
        supplierSku: form.supplierSku.trim() || undefined,
        price: form.requiresQuote ? 0 : Number(form.price || 0),
        listPrice: parseNumber(form.listPrice),
        costPrice: parseNumber(form.costPrice),
        currency: form.currency || "VND",
        requiresQuote: form.requiresQuote,
        quoteNote: form.quoteNote.trim() || undefined,
        taxRate: parseNumber(form.taxRate),
        taxIncluded: form.taxIncluded,
        stockOnHand: parseNumber(form.stockOnHand),
        reorderLevel: parseNumber(form.reorderLevel),
        reorderQty: parseNumber(form.reorderQty),
        minOrderQty: parseNumber(form.minOrderQty),
        stepQty: parseNumber(form.stepQty),
        coverImage: form.coverImage || undefined,
        status: form.status as Row["status"],
        description: form.description || undefined,
      });
      setForm({
        ...DEFAULT_FORM,
        typeId: types[0]?.id || "",
      });
      triggerReload();
    } finally {
      setCreating(false);
    }
  };

  const canSubmit =
    Boolean(
      form.name.trim() &&
        form.sku.trim() &&
        form.typeId &&
        (form.requiresQuote || form.price)
    );

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
              <th className="px-3 py-2 text-left">Sản phẩm</th>
              <th className="px-3 py-2 text-left">SKU / Loại</th>
              <th className="px-3 py-2 text-left">Nguồn hàng</th>
              <th className="px-3 py-2 text-right">Giá bán</th>
              <th className="px-3 py-2 text-right">Giá nhập</th>
              <th className="px-3 py-2 text-center">Tồn kho</th>
              <th className="px-3 py-2 text-left">Báo giá</th>
              <th className="px-3 py-2 text-center">Trạng thái</th>
              <th className="px-3 py-2 text-left">Tạo lúc</th>
              <th className="px-3 py-2 text-left">Cập nhật</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const cost = toNumberOrNull(r.costPrice);
              const sale = toNumberOrNull(r.price) ?? 0;
              const profit = cost != null ? sale - cost : null;
              return (
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
                    <Link href={`/admin/products/${r.id}`} className="text-blue-600 hover:underline font-semibold">
                      {r.name}
                    </Link>
                    <div className="text-xs text-gray-500">{r.brand?.name || "—"}</div>
                  </td>
                  <td className="px-3 py-2 text-sm">
                    <div className="font-mono text-gray-900">{r.sku}</div>
                    <div className="text-xs text-gray-500">{r.type?.name || "—"}</div>
                  </td>
                  <td className="px-3 py-2 text-sm">
                    <div>{r.supplier?.name || "—"}</div>
                    {r.supplierSku && <div className="text-xs text-gray-500">SKU NCC: {r.supplierSku}</div>}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div>{formatCurrency(r.price, r.currency || "VND")}</div>
                    {r.listPrice && (
                      <div className="text-xs text-gray-500">Niêm yết: {formatCurrency(r.listPrice, r.currency || "VND")}</div>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {cost != null ? (
                      <>
                        <div>{formatCurrency(cost, r.currency || "VND")}</div>
                        {profit != null && (
                          <div className="text-xs text-gray-500">
                            Lãi: {formatCurrency(profit, r.currency || "VND")}
                          </div>
                        )}
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-3 py-2 text-center text-sm">
                    <div>{r.stockOnHand ?? 0}</div>
                    {r.reorderLevel != null && (
                      <div className="text-xs text-gray-500">Cảnh báo: {r.reorderLevel}</div>
                    )}
                    {r.minOrderQty != null && (
                      <div className="text-xs text-gray-500">MOQ: {r.minOrderQty}</div>
                    )}
                  </td>
                  <td className="px-3 py-2 text-sm">
                    {r.requiresQuote ? (
                      <span className="inline-flex px-2 py-1 rounded bg-amber-100 text-amber-700 text-xs font-medium">
                        Cần báo giá
                      </span>
                    ) : (
                      <span className="text-xs text-gray-500">Bán trực tiếp</span>
                    )}
                    {r.quoteNote && <div className="text-xs text-gray-500 mt-1">{r.quoteNote}</div>}
                  </td>
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
              );
            })}
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
            <label className="text-sm font-medium text-gray-700">Nhà cung cấp</label>
            <select className="border rounded px-3 py-2" value={form.supplierId} onChange={(e)=>setForm({...form, supplierId:e.target.value})}>
              <option value="">— Không chọn —</option>
              {suppliers.map((s)=>(
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">SKU nhà cung cấp</label>
            <input className="border rounded px-3 py-2" value={form.supplierSku} onChange={(e)=>setForm({...form, supplierSku:e.target.value})} placeholder="Mã NCC" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Giá *</label>
            <input
              type="number"
              min="0"
              className="border rounded px-3 py-2"
              value={form.price}
              onChange={(e)=>setForm({...form, price:e.target.value})}
              placeholder="Giá bán"
              disabled={form.requiresQuote}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Giá niêm yết</label>
            <input type="number" min="0" className="border rounded px-3 py-2" value={form.listPrice} onChange={(e)=>setForm({...form, listPrice:e.target.value})} placeholder="Có thể bỏ trống" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Giá nhập</label>
            <input type="number" min="0" className="border rounded px-3 py-2" value={form.costPrice} onChange={(e)=>setForm({...form, costPrice:e.target.value})} placeholder="Cost price" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Tiền tệ</label>
            <input className="border rounded px-3 py-2" value={form.currency} onChange={(e)=>setForm({...form, currency:e.target.value})} placeholder="VD: VND" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <input type="checkbox" checked={form.requiresQuote} onChange={(e)=>setForm({...form, requiresQuote: e.target.checked})} />
              Cần báo giá riêng
            </label>
            <textarea className="border rounded px-3 py-2 min-h-[80px]" value={form.quoteNote} onChange={(e)=>setForm({...form, quoteNote:e.target.value})} placeholder="Ghi chú cho báo giá" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Thuế (%)</label>
            <input type="number" step="0.01" className="border rounded px-3 py-2" value={form.taxRate} onChange={(e)=>setForm({...form, taxRate:e.target.value})} placeholder="0.10 = 10%" />
            <label className="inline-flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={form.taxIncluded} onChange={(e)=>setForm({...form, taxIncluded: e.target.checked})} />
              Giá đã gồm thuế
            </label>
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
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Tồn kho ban đầu</label>
            <input type="number" min="0" className="border rounded px-3 py-2" value={form.stockOnHand} onChange={(e)=>setForm({...form, stockOnHand:e.target.value})} placeholder="0" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Mức cảnh báo</label>
            <input type="number" min="0" className="border rounded px-3 py-2" value={form.reorderLevel} onChange={(e)=>setForm({...form, reorderLevel:e.target.value})} placeholder="VD: 10" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Số lượng đặt lại</label>
            <input type="number" min="0" className="border rounded px-3 py-2" value={form.reorderQty} onChange={(e)=>setForm({...form, reorderQty:e.target.value})} placeholder="VD: 50" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">MOQ (Min order qty)</label>
            <input type="number" min="0" className="border rounded px-3 py-2" value={form.minOrderQty} onChange={(e)=>setForm({...form, minOrderQty:e.target.value})} placeholder="VD: 1" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Bước tăng số lượng</label>
            <input type="number" min="0" className="border rounded px-3 py-2" value={form.stepQty} onChange={(e)=>setForm({...form, stepQty:e.target.value})} placeholder="VD: 1" />
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
          disabled={!canSubmit || creating}
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
