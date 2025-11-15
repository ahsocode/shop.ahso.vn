"use client";

import { useEffect, useState, use, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getJSON, patchJSON, del } from "../../_lib/fetcher";

type Option = { id: string; name: string };
type ListResp<T> = { data: T[]; meta: { total: number; page: number; pageSize: number } };
type ProductDetail = {
  id: string;
  name: string;
  slug: string;
  sku: string;
  description: string | null;
  coverImage: string | null;
  price: number;
  listPrice: number | null;
  currency: string | null;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  brandId: string | null;
  typeId: string;
  stockOnHand: number | null;
  createdAt: string;
  updatedAt: string;
  brand: { id: string; name: string } | null;
  type: { id: string; name: string } | null;
};

const formatCurrency = (value: number, currency = "VND") =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency, maximumFractionDigits: 0 }).format(value);

const formatDate = (iso: string) =>
  new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));

export default function AdminProductDetail({ params }: { params: Promise<{ productId: string }> }) {
  const { productId } = use(params);
  const router = useRouter();
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [types, setTypes] = useState<Option[]>([]);
  const [brands, setBrands] = useState<Option[]>([]);

  const [general, setGeneral] = useState({ name: "", slug: "", sku: "", description: "" });
  const [assoc, setAssoc] = useState({ typeId: "", brandId: "" });
  const [pricing, setPricing] = useState({ price: "", listPrice: "", stockOnHand: "" });
  const [status, setStatus] = useState<ProductDetail["status"]>("DRAFT");
  const [media, setMedia] = useState({ coverImage: "" });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [detailResp, typeResp, brandResp] = await Promise.all([
        getJSON<{ data: ProductDetail }>(`/api/admin/products/${productId}`),
        getJSON<ListResp<{ id: string; name: string }>>(`/api/admin/product-types?page=1&pageSize=200`),
        getJSON<ListResp<{ id: string; name: string }>>(`/api/admin/brands?page=1&pageSize=200`),
      ]);
      setProduct(detailResp.data);
      setTypes(typeResp.data.map((t) => ({ id: t.id, name: t.name })));
      setBrands(brandResp.data.map((b) => ({ id: b.id, name: b.name })));
      setGeneral({
        name: detailResp.data.name,
        slug: detailResp.data.slug,
        sku: detailResp.data.sku,
        description: detailResp.data.description ?? "",
      });
      setAssoc({
        typeId: detailResp.data.typeId,
        brandId: detailResp.data.brandId ?? "",
      });
      setPricing({
        price: String(detailResp.data.price ?? ""),
        listPrice: detailResp.data.listPrice ? String(detailResp.data.listPrice) : "",
        stockOnHand: detailResp.data.stockOnHand != null ? String(detailResp.data.stockOnHand) : "",
      });
      setStatus(detailResp.data.status);
      setMedia({ coverImage: detailResp.data.coverImage ?? "" });
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleUpdate = async (payload: Record<string, unknown>) => {
    setSaving(true);
    try {
      const updated = await patchJSON<{ data: ProductDetail }>(`/api/admin/products/${productId}`, payload);
      setProduct(updated.data);
      setGeneral({
        name: updated.data.name,
        slug: updated.data.slug,
        sku: updated.data.sku,
        description: updated.data.description ?? "",
      });
      setAssoc({ typeId: updated.data.typeId, brandId: updated.data.brandId ?? "" });
      setPricing({
        price: String(updated.data.price ?? ""),
        listPrice: updated.data.listPrice ? String(updated.data.listPrice) : "",
        stockOnHand: updated.data.stockOnHand != null ? String(updated.data.stockOnHand) : "",
      });
      setStatus(updated.data.status);
      setMedia({ coverImage: updated.data.coverImage ?? "" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Xóa sản phẩm này?")) return;
    await del(`/api/admin/products/${productId}`);
    router.push("/admin/products");
  };

  if (loading && !product) {
    return <div className="p-6">Đang tải...</div>;
  }

  if (!product) {
    return <div className="p-6 text-red-600">Không tìm thấy sản phẩm</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <Link href="/admin/products" className="text-sm text-blue-600 hover:underline">
            ← Quay lại danh sách
          </Link>
          <h1 className="text-2xl font-bold mt-1">{product.name}</h1>
          <p className="text-sm text-gray-500">SKU: {product.sku}</p>
        </div>
        <button onClick={handleDelete} className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700">
          Xóa sản phẩm
        </button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="border rounded-lg bg-white p-4 space-y-3">
          <div className="flex justify-between items-center">
            <h2 className="font-semibold">Thông tin cơ bản</h2>
            <button
              onClick={() =>
                handleUpdate({
                  name: general.name,
                  slug: general.slug,
                  sku: general.sku,
                  description: general.description || null,
                })
              }
              className="text-sm px-3 py-1.5 rounded bg-blue-600 text-white disabled:opacity-50"
              disabled={saving}
            >
              Lưu
            </button>
          </div>
          <input className="border rounded px-3 py-2" value={general.name} onChange={(e)=>setGeneral({...general, name: e.target.value})} placeholder="Tên" />
          <input className="border rounded px-3 py-2" value={general.slug} onChange={(e)=>setGeneral({...general, slug: e.target.value})} placeholder="Slug" />
          <input className="border rounded px-3 py-2" value={general.sku} onChange={(e)=>setGeneral({...general, sku: e.target.value})} placeholder="SKU" />
          <textarea className="border rounded px-3 py-2 min-h-[120px]" value={general.description} onChange={(e)=>setGeneral({...general, description: e.target.value})} placeholder="Mô tả" />
        </div>

        <div className="border rounded-lg bg-white p-4 space-y-3">
          <div className="flex justify-between items-center">
            <h2 className="font-semibold">Phân loại</h2>
            <button
              onClick={() => handleUpdate({ typeId: assoc.typeId, brandId: assoc.brandId || null })}
              className="text-sm px-3 py-1.5 rounded bg-blue-600 text-white disabled:opacity-50"
              disabled={saving}
            >
              Lưu
            </button>
          </div>
          <select className="border rounded px-3 py-2" value={assoc.typeId} onChange={(e)=>setAssoc({...assoc, typeId: e.target.value})}>
            {types.map((t)=>(
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          <select className="border rounded px-3 py-2" value={assoc.brandId} onChange={(e)=>setAssoc({...assoc, brandId: e.target.value})}>
            <option value="">— Không chọn —</option>
            {brands.map((b)=>(
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>

        <div className="border rounded-lg bg-white p-4 space-y-3">
          <div className="flex justify-between items-center">
            <h2 className="font-semibold">Giá & tồn kho</h2>
            <button
              onClick={() =>
                handleUpdate({
                  price: Number(pricing.price || 0),
                  listPrice: pricing.listPrice ? Number(pricing.listPrice) : null,
                  stockOnHand: pricing.stockOnHand ? Number(pricing.stockOnHand) : 0,
                  status,
                })
              }
              className="text-sm px-3 py-1.5 rounded bg-blue-600 text-white disabled:opacity-50"
              disabled={saving}
            >
              Lưu
            </button>
          </div>
          <input type="number" min="0" className="border rounded px-3 py-2" value={pricing.price} onChange={(e)=>setPricing({...pricing, price: e.target.value})} placeholder="Giá bán" />
          <input type="number" min="0" className="border rounded px-3 py-2" value={pricing.listPrice} onChange={(e)=>setPricing({...pricing, listPrice: e.target.value})} placeholder="Giá niêm yết" />
          <input type="number" min="0" className="border rounded px-3 py-2" value={pricing.stockOnHand} onChange={(e)=>setPricing({...pricing, stockOnHand: e.target.value})} placeholder="Tồn kho" />
          <select className="border rounded px-3 py-2" value={status} onChange={(e)=>setStatus(e.target.value as ProductDetail["status"])}>
            <option value="DRAFT">DRAFT</option>
            <option value="PUBLISHED">PUBLISHED</option>
            <option value="ARCHIVED">ARCHIVED</option>
          </select>
          <div className="text-sm text-gray-500">Giá hiện tại: {formatCurrency(product.price, product.currency || "VND")}</div>
        </div>

        <div className="border rounded-lg bg-white p-4 space-y-3">
          <div className="flex justify-between items-center">
            <h2 className="font-semibold">Hình ảnh</h2>
            <button
              onClick={() => handleUpdate({ coverImage: media.coverImage || null })}
              className="text-sm px-3 py-1.5 rounded bg-blue-600 text-white disabled:opacity-50"
              disabled={saving}
            >
              Lưu
            </button>
          </div>
          {media.coverImage && (
            <div className="relative w-full h-56 border rounded bg-white overflow-hidden">
              <Image src={media.coverImage} alt={product.name} fill className="object-cover" />
            </div>
          )}
          <input className="border rounded px-3 py-2" value={media.coverImage} onChange={(e)=>setMedia({ coverImage: e.target.value })} placeholder="https://..." />
        </div>
      </div>

      <div className="border rounded-lg bg-white p-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
        <div>
          <div className="text-gray-500">ID</div>
          <div className="font-mono break-all">{product.id}</div>
        </div>
        <div>
          <div className="text-gray-500">Tạo lúc</div>
          <div>{formatDate(product.createdAt)}</div>
        </div>
        <div>
          <div className="text-gray-500">Cập nhật</div>
          <div>{formatDate(product.updatedAt)}</div>
        </div>
        <div>
          <div className="text-gray-500">Trạng thái</div>
          <div>{status}</div>
        </div>
      </div>
    </div>
  );
}
