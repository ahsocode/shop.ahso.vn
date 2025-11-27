"use client";

import { useEffect, useState, use, useCallback, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ImageCropDialog } from "@/components/image/image-crop-dialog";
import { getJSON, patchJSON, del, makeHeaders } from "../../_lib/fetcher";

type Option = { id: string; name: string };

type ListResp<T> = {
  data: T[];
  meta: { total: number; page: number; pageSize: number };
};

type ProductImageRow = {
  id: string;
  url: string;
  alt: string | null;
  sortOrder: number | null;
};

type ProductSpecRow = {
  id: string;
  name: string;
  valueString: string | null;
  valueNumber: number | null;
  valueBoolean: boolean | null;
  unitOverride: string | null;
  note: string | null;
  sortOrder: number | null;
};

// Spec-def dùng cho dropdown chọn thông số có sẵn
type SpecDefOption = {
  id: string;
  name: string;
};

// ⚠️ API /api/admin/products/[id] cần select đủ các field bên dưới
type ProductDetail = {
  id: string;
  name: string;
  slug: string;
  sku: string;
  description: string | null;
  coverImage: string | null;

  price: number;
  listPrice: number | null;
  costPrice: number | null;
  currency: string | null;

  // Lợi nhuận (backend tính sẵn)
  profitAmount: number | string | null;
  profitMargin: number | string | null;

  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  brandId: string | null;
  typeId: string;
  stockOnHand: number | null;

  // Nguồn hàng & cấu hình bán
  supplierId: string | null;
  supplierSku: string | null;
  requiresQuote: boolean;
  quoteNote: string | null;
  taxRate: number | null;
  taxIncluded: boolean | null;

  // Tồn kho nâng cao
  reorderLevel: number | null;
  reorderQty: number | null;
  minOrderQty: number | null;
  stepQty: number | null;

  // Media + specs
  images: ProductImageRow[];
  specs: ProductSpecRow[];

  createdAt: string;
  updatedAt: string;

  brand: { id: string; name: string } | null;
  type: { id: string; name: string } | null;
  supplier?: { id: string; name: string } | null;
};

const formatCurrency = (value: number, currency = "VND") =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);

const formatDate = (iso: string) =>
  new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));

// dùng chung cho profitAmount / profitMargin
const toNumberOrNull = (v: number | string | null | undefined) => {
  if (v === null || v === undefined) return null;
  const num = typeof v === "string" ? Number(v) : v;
  return Number.isFinite(num) ? num : null;
};

export default function AdminProductDetail({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  const { productId } = use(params);
  const router = useRouter();

  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [types, setTypes] = useState<Option[]>([]);
  const [brands, setBrands] = useState<Option[]>([]);
  const [suppliers, setSuppliers] = useState<Option[]>([]);

  // ====== SPEC-DEFS (bảng chọn thông số) ======
  const [specDefs, setSpecDefs] = useState<SpecDefOption[]>([]);
  const [selectedSpecDefId, setSelectedSpecDefId] = useState("");

  // ====== STATE FORM ======
  const [general, setGeneral] = useState({
    name: "",
    slug: "",
    sku: "",
    description: "",
  });

  const [assoc, setAssoc] = useState({
    typeId: "",
    brandId: "",
  });

  const [pricing, setPricing] = useState({
    price: "",
    listPrice: "",
    costPrice: "",
    stockOnHand: "",
  });

  const [status, setStatus] = useState<ProductDetail["status"]>("DRAFT");

  const [media, setMedia] = useState({
    coverImage: "",
  });

  const [sourceConfig, setSourceConfig] = useState({
    supplierId: "",
    supplierSku: "",
    requiresQuote: false,
    quoteNote: "",
    currency: "VND",
    taxRate: "",
    taxIncluded: true,
  });

  // Tồn kho nâng cao: theo yêu cầu chỉ giữ mức cảnh báo + MOQ
  const [inventoryAdv, setInventoryAdv] = useState({
    reorderLevel: "",
    minOrderQty: "",
  });

  // ====== STATE MEDIA & SPECS ======
  type EditableImage = {
    id?: string;
    url: string;
    alt: string;
    sortOrder: string;
  };

  type EditableSpec = {
    id?: string; // id productspecvalue (nếu có)
    name: string;
    valueString: string;
    unitOverride: string;
    note: string;
    sortOrder: string;
  };

const [imageList, setImageList] = useState<EditableImage[]>([]);
const [specList, setSpecList] = useState<EditableSpec[]>([]);
  const coverFileInputRef = useRef<HTMLInputElement | null>(null);
  const galleryFileInputRef = useRef<HTMLInputElement | null>(null);
  const [coverCropOpen, setCoverCropOpen] = useState(false);
  const [coverCropSource, setCoverCropSource] = useState<{
    url: string;
    fileName: string;
    revokeOnClose: boolean;
  } | null>(null);
  const [coverUploading, setCoverUploading] = useState(false);
  const [galleryCropOpen, setGalleryCropOpen] = useState(false);
  const [galleryCropSource, setGalleryCropSource] = useState<{
    url: string;
    fileName: string;
    revokeOnClose: boolean;
  } | null>(null);
  const [galleryUploading, setGalleryUploading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [
        detailResp,
        typeResp,
        brandResp,
        supplierResp,
        specDefResp,
      ] = await Promise.all([
        getJSON<{ data: ProductDetail }>(`/api/admin/products/${productId}`),
        getJSON<ListResp<{ id: string; name: string }>>(
          `/api/admin/product-types?page=1&pageSize=200`,
        ),
        getJSON<ListResp<{ id: string; name: string }>>(
          `/api/admin/brands?page=1&pageSize=200`,
        ),
        getJSON<ListResp<{ id: string; name: string }>>(
          `/api/admin/suppliers?page=1&pageSize=200`,
        ),
        getJSON<ListResp<{ id: string; name: string }>>(
          `/api/admin/spec-defs?page=1&pageSize=200`,
        ),
      ]);

      const detail = detailResp.data;

      setProduct(detail);
      setTypes(typeResp.data.map((t) => ({ id: t.id, name: t.name })));
      setBrands(brandResp.data.map((b) => ({ id: b.id, name: b.name })));
      setSuppliers(supplierResp.data.map((s) => ({ id: s.id, name: s.name })));
      setSpecDefs(specDefResp.data.map((d) => ({ id: d.id, name: d.name })));

      // General
      setGeneral({
        name: detail.name,
        slug: detail.slug,
        sku: detail.sku,
        description: detail.description ?? "",
      });

      // Assoc
      setAssoc({
        typeId: detail.typeId,
        brandId: detail.brandId ?? "",
      });

      // Pricing
      setPricing({
        price: detail.price != null ? String(detail.price) : "",
        listPrice: detail.listPrice != null ? String(detail.listPrice) : "",
        costPrice: detail.costPrice != null ? String(detail.costPrice) : "",
        stockOnHand:
          detail.stockOnHand != null ? String(detail.stockOnHand) : "",
      });

      setStatus(detail.status);
      setMedia({ coverImage: detail.coverImage ?? "" });

      // Source & selling config (có thể bỏ trống)
      setSourceConfig({
        supplierId: detail.supplierId ?? "",
        supplierSku: detail.supplierSku ?? "",
        requiresQuote: detail.requiresQuote ?? false,
        quoteNote: detail.quoteNote ?? "",
        currency: detail.currency ?? "VND",
        taxRate: toPercentString(detail.taxRate),
        taxIncluded: detail.taxIncluded ?? true,
      });

      // Advanced inventory: chỉ 2 field
      setInventoryAdv({
        reorderLevel:
          detail.reorderLevel != null ? String(detail.reorderLevel) : "",
        minOrderQty:
          detail.minOrderQty != null ? String(detail.minOrderQty) : "",
      });

      // Image list
      setImageList(
        (detail.images || [])
          .slice()
          .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
          .map((img) => ({
            id: img.id,
            url: img.url,
            alt: img.alt ?? "",
            sortOrder: img.sortOrder != null ? String(img.sortOrder) : "",
          })),
      );

      // Spec list
      setSpecList(
        (detail.specs || [])
          .slice()
          .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
          .map((s) => ({
            id: s.id,
            name: s.name,
            valueString: s.valueString ?? "",
            unitOverride: s.unitOverride ?? "",
            note: s.note ?? "",
            sortOrder: s.sortOrder != null ? String(s.sortOrder) : "",
          })),
      );
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : "Không tải được dữ liệu sản phẩm";
      toast.error(msg);
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
      const updated = await patchJSON<{ data: ProductDetail; warnings?: string[] }>(
        `/api/admin/products/${productId}`,
        payload,
      );
      const detail = updated.data;
      setProduct(detail);

      // đồng bộ lại state giống trong load()
      setGeneral({
        name: detail.name,
        slug: detail.slug,
        sku: detail.sku,
        description: detail.description ?? "",
      });
      setAssoc({
        typeId: detail.typeId,
        brandId: detail.brandId ?? "",
      });
      setPricing({
        price: detail.price != null ? String(detail.price) : "",
        listPrice: detail.listPrice != null ? String(detail.listPrice) : "",
        costPrice: detail.costPrice != null ? String(detail.costPrice) : "",
        stockOnHand:
          detail.stockOnHand != null ? String(detail.stockOnHand) : "",
      });
      setStatus(detail.status);
      setMedia({ coverImage: detail.coverImage ?? "" });
      setSourceConfig({
        supplierId: detail.supplierId ?? "",
        supplierSku: detail.supplierSku ?? "",
        requiresQuote: detail.requiresQuote ?? false,
        quoteNote: detail.quoteNote ?? "",
        currency: detail.currency ?? "VND",
        taxRate: toPercentString(detail.taxRate),
        taxIncluded: detail.taxIncluded ?? true,
      });
      setInventoryAdv({
        reorderLevel:
          detail.reorderLevel != null ? String(detail.reorderLevel) : "",
        minOrderQty:
          detail.minOrderQty != null ? String(detail.minOrderQty) : "",
      });
      setImageList(
        (detail.images || [])
          .slice()
          .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
          .map((img) => ({
            id: img.id,
            url: img.url,
            alt: img.alt ?? "",
            sortOrder: img.sortOrder != null ? String(img.sortOrder) : "",
          })),
      );
      setSpecList(
        (detail.specs || [])
          .slice()
          .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
          .map((s) => ({
            id: s.id,
            name: s.name,
            valueString: s.valueString ?? "",
            unitOverride: s.unitOverride ?? "",
            note: s.note ?? "",
            sortOrder: s.sortOrder != null ? String(s.sortOrder) : "",
          })),
      );

      toast.success("Cập nhật sản phẩm thành công");
      updated.warnings?.forEach((w) => toast.warning(w));
      return detail;
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : "Cập nhật sản phẩm thất bại";
      toast.error(msg);
      throw e;
    } finally {
      setSaving(false);
    }
  };

  const buildSpecsPayload = () =>
    specList
      .filter((s) => s.name.trim())
      .map((s, idx) => ({
        name: s.name.trim(),
        valueString: s.valueString.trim() || null,
        valueNumber: null,
        valueBoolean: null,
        unitOverride: s.unitOverride.trim() || null,
        note: s.note.trim() || null,
        sortOrder: s.sortOrder ? Number(s.sortOrder) : idx,
      }));

  const buildImagesPayload = () =>
    imageList
      .filter((img) => img.url.trim())
      .map((img, idx) => ({
        url: img.url.trim(),
        alt: img.alt.trim() || null,
        sortOrder: img.sortOrder ? Number(img.sortOrder) : idx,
      }));

  const parseOptionalNumber = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    const num = Number(trimmed);
    return Number.isFinite(num) ? num : undefined;
  };

  const buildFullPayload = () => {
    const payload: Record<string, unknown> = {
      name: general.name,
      slug: general.slug || undefined,
      sku: general.sku,
      description: general.description || null,
      typeId: assoc.typeId,
      brandId: assoc.brandId || null,
      price: Number(pricing.price || 0),
      listPrice: pricing.listPrice ? Number(pricing.listPrice) : null,
      costPrice: pricing.costPrice ? Number(pricing.costPrice) : null,
      stockOnHand: pricing.stockOnHand ? Number(pricing.stockOnHand) : 0,
      status,
      supplierId: sourceConfig.supplierId || null,
      supplierSku: sourceConfig.supplierSku || null,
      requiresQuote: sourceConfig.requiresQuote,
      quoteNote: sourceConfig.quoteNote || null,
      currency: sourceConfig.currency || "VND",
      taxRate: parsePercentOrNull(sourceConfig.taxRate),
      taxIncluded: sourceConfig.taxIncluded,
      coverImage: media.coverImage || null,
      specs: buildSpecsPayload(),
      images: buildImagesPayload(),
    };

    const reorderLevelValue = parseOptionalNumber(inventoryAdv.reorderLevel);
    if (typeof reorderLevelValue !== "undefined") {
      payload.reorderLevel = reorderLevelValue;
    }
    const minOrderQtyValue = parseOptionalNumber(inventoryAdv.minOrderQty);
    if (typeof minOrderQtyValue !== "undefined") {
      payload.minOrderQty = minOrderQtyValue;
    }

    return payload;
  };

  const handleSaveAll = () => handleUpdate(buildFullPayload());

  const handleDelete = async () => {
    if (!confirm("Xóa sản phẩm này?")) return;
    try {
      await del(`/api/admin/products/${productId}`);
      toast.success("Đã xóa sản phẩm");
      router.push("/admin/products");
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : "Xóa sản phẩm thất bại";
      toast.error(msg);
    }
  };

const toPercentString = (value?: number | null) => {
  if (value === null || value === undefined) return "";
  const percent = value * 100;
  if (!Number.isFinite(percent)) return "";
  return Number(percent.toFixed(4)).toString();
};

const parsePercentOrNull = (v: string) => {
  const t = v.trim().replace(",", ".");
  if (!t) return null;
  const num = Number(t);
  if (!Number.isFinite(num)) return null;
  return num / 100;
};

  // === helper: thêm thông số từ bảng spec-def có sẵn ===
  const handleAddSpecFromDef = () => {
    if (!selectedSpecDefId) return;
    const def = specDefs.find((d) => d.id === selectedSpecDefId);
    if (!def) return;

    const exists = specList.some(
      (s) => s.name.trim().toLowerCase() === def.name.trim().toLowerCase(),
    );
    if (exists) return;

    setSpecList((prev) => [
      ...prev,
      {
        name: def.name,
        valueString: "",
        unitOverride: "",
        note: "",
        sortOrder: String(prev.length + 1),
      },
    ]);
  };

  const handleAddEmptySpec = () => {
    setSpecList((prev) => [
      ...prev,
      {
        name: "",
        valueString: "",
        unitOverride: "",
        note: "",
        sortOrder: String(prev.length + 1),
      },
    ]);
  };

  const handleSaveSpecs = () => {
    return handleUpdate({ specs: buildSpecsPayload() });
  };

  // gallery helpers
  const addImageRow = () => {
    setImageList((prev) => [
      ...prev,
      { url: "", alt: "", sortOrder: String(prev.length + 1) },
    ]);
  };

  const handleCoverUploadClick = () => {
    coverFileInputRef.current?.click();
  };

  const handleCoverFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (coverFileInputRef.current) {
      coverFileInputRef.current.value = "";
    }
    const url = URL.createObjectURL(file);
    setCoverCropSource((prev) => {
      if (prev?.revokeOnClose && prev.url) {
        URL.revokeObjectURL(prev.url);
      }
      return { url, fileName: file.name, revokeOnClose: true };
    });
    setCoverCropOpen(true);
  };

  const uploadCoverImage = async (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch(`/api/admin/products/${productId}/upload-cover`, {
      method: "POST",
      headers: makeHeaders(),
      body: fd,
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(getErrorMessage(data, "Không thể tải ảnh đại diện"));
    }
    const url =
      data?.data?.coverImage || data?.coverImage || data?.data?.url || "";
    setMedia({ coverImage: url });
    toast.success("Đã cập nhật ảnh đại diện");
  };

  const handleCoverCropComplete = async (result: {
    file: File;
    previewUrl: string;
  }) => {
    setCoverCropOpen(false);
    setCoverUploading(true);
    try {
      await uploadCoverImage(result.file);
    } catch (error) {
      toast.error(extractErrorMessage(error));
    } finally {
      URL.revokeObjectURL(result.previewUrl);
      setCoverCropSource((prev) => {
        if (prev?.revokeOnClose && prev.url) {
          URL.revokeObjectURL(prev.url);
        }
        return null;
      });
      setCoverUploading(false);
    }
  };

  const handleGalleryUploadClick = () => {
    galleryFileInputRef.current?.click();
  };

  const handleGalleryFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (galleryFileInputRef.current) {
      galleryFileInputRef.current.value = "";
    }
    const url = URL.createObjectURL(file);
    setGalleryCropSource((prev) => {
      if (prev?.revokeOnClose && prev.url) {
        URL.revokeObjectURL(prev.url);
      }
      return { url, fileName: file.name, revokeOnClose: true };
    });
    setGalleryCropOpen(true);
  };

  const uploadGalleryImage = async (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch(
      `/api/admin/products/${productId}/upload-image`,
      {
        method: "POST",
        headers: makeHeaders(),
        body: fd,
      },
    );
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(getErrorMessage(data, "Không thể tải ảnh gallery"));
    }
    const created = data?.data;
    if (created?.url) {
      setImageList((prev) => [
        ...prev,
        {
          id: created.id,
          url: created.url,
          alt: created.alt ?? "",
          sortOrder:
            created.sortOrder !== undefined
              ? String(created.sortOrder)
              : String(prev.length + 1),
        },
      ]);
    }
    toast.success("Đã thêm ảnh vào thư viện");
  };

  const handleGalleryCropComplete = async (result: {
    file: File;
    previewUrl: string;
  }) => {
    setGalleryCropOpen(false);
    setGalleryUploading(true);
    try {
      await uploadGalleryImage(result.file);
    } catch (error) {
      toast.error(extractErrorMessage(error));
    } finally {
      URL.revokeObjectURL(result.previewUrl);
      setGalleryCropSource((prev) => {
        if (prev?.revokeOnClose && prev.url) {
          URL.revokeObjectURL(prev.url);
        }
        return null;
      });
      setGalleryUploading(false);
    }
  };

  const handleCoverDialogOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setCoverCropOpen(false);
      setCoverCropSource((prev) => {
        if (prev?.revokeOnClose && prev.url) {
          URL.revokeObjectURL(prev.url);
          return null;
        }
        return prev;
      });
    } else if (coverCropSource) {
      setCoverCropOpen(true);
    }
  };

  const handleGalleryDialogOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setGalleryCropOpen(false);
      setGalleryCropSource((prev) => {
        if (prev?.revokeOnClose && prev.url) {
          URL.revokeObjectURL(prev.url);
          return null;
        }
        return prev;
      });
    } else if (galleryCropSource) {
      setGalleryCropOpen(true);
    }
  };

  if (loading && !product) {
    return (
      <div className="p-6 text-sm text-gray-600">
        Đang tải thông tin sản phẩm...
      </div>
    );
  }

  if (!product) {
    return (
      <div className="p-6 text-sm text-red-600">
        Không tìm thấy sản phẩm
      </div>
    );
  }

  const currency = product.currency || "VND";
  const profitAmountNum = toNumberOrNull(product.profitAmount);
  const profitMarginNum = toNumberOrNull(product.profitMargin);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 border-b border-gray-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            href="/admin/products"
            className="inline-flex items-center text-sm text-blue-600 hover:underline"
          >
            ← Quay lại danh sách
          </Link>
          <h1 className="mt-2 text-2xl font-bold tracking-tight">
            {product.name}
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-gray-500">
            <span className="font-mono">
              SKU: <span className="font-semibold">{product.sku}</span>
            </span>
            <span>·</span>
            <span>
              Loại: {product.type?.name || "—"} · Thương hiệu:{" "}
              {product.brand?.name || "—"}
            </span>
            {product.supplier && (
              <>
                <span>·</span>
                <span>Nhà cung cấp: {product.supplier.name}</span>
              </>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <span
            className={[
              "inline-flex rounded-full px-3 py-1 text-xs font-medium",
              status === "PUBLISHED"
                ? "bg-green-50 text-green-700 ring-1 ring-green-100"
                : status === "ARCHIVED"
                ? "bg-gray-100 text-gray-700 ring-1 ring-gray-200"
                : "bg-yellow-50 text-yellow-700 ring-1 ring-yellow-100",
            ].join(" ")}
          >
            Trạng thái: {status}
          </span>

          <button
            onClick={handleSaveAll}
            disabled={saving}
            className="inline-flex items-center rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Lưu toàn bộ
          </button>

          <button
            onClick={handleDelete}
            className="inline-flex items-center rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1"
          >
            Xóa sản phẩm
          </button>
        </div>
      </div>

      {/* Info summary cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        {/* Giá & lãi */}
        <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
          <div className="text-xs text-gray-500">Giá & lợi nhuận</div>
          <div className="mt-1 text-lg font-semibold text-gray-900">
            {formatCurrency(product.price, currency)}
          </div>
          {product.listPrice && (
            <div className="mt-1 text-xs text-gray-500">
              Niêm yết: {formatCurrency(product.listPrice, currency)}
            </div>
          )}
          {product.costPrice != null && (
            <div className="mt-1 text-xs text-gray-500">
              Giá nhập: {formatCurrency(product.costPrice, currency)}
            </div>
          )}
          {profitAmountNum != null && (
            <div className="mt-1 text-xs text-green-700">
              Lãi: {formatCurrency(profitAmountNum, currency)}{" "}
              {profitMarginNum != null && (
                <span className="text-[11px] text-gray-500">
                  ({profitMarginNum.toFixed(1)}%)
                </span>
              )}
            </div>
          )}
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
          <div className="text-xs text-gray-500">Tồn kho</div>
          <div className="mt-1 text-lg font-semibold text-gray-900">
            {product.stockOnHand ?? 0}
          </div>
          <div className="mt-1 text-xs text-gray-500">
            SKU: {product.sku}
          </div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
          <div className="text-xs text-gray-500">Thời gian</div>
          <div className="mt-1 text-xs text-gray-600">
            Tạo: {formatDate(product.createdAt)}
          </div>
          <div className="mt-1 text-xs text-gray-600">
            Cập nhật: {formatDate(product.updatedAt)}
          </div>
        </div>
      </div>

      {/* Main grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* LEFT: General + Assoc + Source + Specs */}
        <div className="space-y-4">
          {/* General info (bắt buộc) */}
          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-gray-900">
                Thông tin cơ bản
              </h2>
              <button
                onClick={() =>
                  handleUpdate({
                    name: general.name,
                    slug: general.slug || undefined,
                    sku: general.sku,
                    description: general.description || null,
                  })
                }
                className="text-xs rounded-lg bg-blue-600 px-3 py-1.5 font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
                disabled={saving}
              >
                Lưu
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-700">
                Tên sản phẩm
              </label>
              <input
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={general.name}
                onChange={(e) =>
                  setGeneral({ ...general, name: e.target.value })
                }
              />
            </div>

            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-700">
                  Slug
                </label>
                <input
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  value={general.slug}
                  onChange={(e) =>
                    setGeneral({ ...general, slug: e.target.value })
                  }
                  placeholder="Tự gen nếu để trống khi cập nhật"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-700">
                  SKU
                </label>
                <input
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm font-mono focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  value={general.sku}
                  onChange={(e) =>
                    setGeneral({ ...general, sku: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="mt-3 space-y-2">
              <label className="text-xs font-medium text-gray-700">
                Mô tả
              </label>
              <textarea
                className="w-full min-h-[120px] rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={general.description}
                onChange={(e) =>
                  setGeneral({ ...general, description: e.target.value })
                }
                placeholder="Mô tả chi tiết / công dụng / thông số tổng quát..."
              />
            </div>
          </div>

          {/* Association (bắt buộc) */}
          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-gray-900">
                Phân loại
              </h2>
              <button
                onClick={() =>
                  handleUpdate({
                    typeId: assoc.typeId,
                    brandId: assoc.brandId || null,
                  })
                }
                className="text-xs rounded-lg bg-blue-600 px-3 py-1.5 font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
                disabled={saving}
              >
                Lưu
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-700">
                Loại sản phẩm
              </label>
              <select
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={assoc.typeId}
                onChange={(e) =>
                  setAssoc({ ...assoc, typeId: e.target.value })
                }
              >
                {types.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-3 space-y-2">
              <label className="text-xs font-medium text-gray-700">
                Thương hiệu
              </label>
              <select
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={assoc.brandId}
                onChange={(e) =>
                  setAssoc({ ...assoc, brandId: e.target.value })
                }
              >
                <option value="">— Không chọn —</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Source & selling config (có thể bỏ trống) */}
          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-gray-900">
                Nguồn hàng & cấu hình bán
              </h2>
              <button
                onClick={() =>
                  handleUpdate({
                    supplierId: sourceConfig.supplierId || null,
                    supplierSku: sourceConfig.supplierSku || null,
                    requiresQuote: sourceConfig.requiresQuote,
                    quoteNote: sourceConfig.quoteNote || null,
                    currency: sourceConfig.currency || "VND",
                    taxRate: parsePercentOrNull(sourceConfig.taxRate),
                    taxIncluded: sourceConfig.taxIncluded,
                  })
                }
                className="text-xs rounded-lg bg-blue-600 px-3 py-1.5 font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
                disabled={saving}
              >
                Lưu
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-700">
                Nhà cung cấp
              </label>
              <select
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={sourceConfig.supplierId}
                onChange={(e) =>
                  setSourceConfig({
                    ...sourceConfig,
                    supplierId: e.target.value,
                  })
                }
              >
                <option value="">— Không chọn —</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-3 space-y-2">
              <label className="text-xs font-medium text-gray-700">
                SKU nhà cung cấp
              </label>
              <input
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={sourceConfig.supplierSku}
                onChange={(e) =>
                  setSourceConfig({
                    ...sourceConfig,
                    supplierSku: e.target.value,
                  })
                }
                placeholder="Mã sản phẩm phía NCC"
              />
            </div>

            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-700">
                  Tiền tệ
                </label>
                <input
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  value={sourceConfig.currency}
                  onChange={(e) =>
                    setSourceConfig({
                      ...sourceConfig,
                      currency: e.target.value,
                    })
                  }
                  placeholder="VD: VND"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-700">
                  Thuế VAT (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  value={sourceConfig.taxRate}
                  onChange={(e) =>
                    setSourceConfig({
                      ...sourceConfig,
                      taxRate: e.target.value,
                    })
                  }
                  placeholder="Ví dụ: 10"
                />
              </div>
            </div>

            <div className="mt-3 space-y-2">
              <label className="inline-flex items-center gap-2 text-xs text-gray-700">
                <input
                  type="checkbox"
                  checked={sourceConfig.taxIncluded}
                  onChange={(e) =>
                    setSourceConfig({
                      ...sourceConfig,
                      taxIncluded: e.target.checked,
                    })
                  }
                />
                Giá hiển thị đã bao gồm VAT
              </label>
            </div>

            <div className="mt-3 space-y-2">
              <label className="text-xs font-medium text-gray-700">
                Báo giá
              </label>
              <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs">
                <input
                  type="checkbox"
                  checked={sourceConfig.requiresQuote}
                  onChange={(e) =>
                    setSourceConfig({
                      ...sourceConfig,
                      requiresQuote: e.target.checked,
                    })
                  }
                />
                <span>Cần báo giá riêng (không hiển thị giá trên web)</span>
              </div>
              <textarea
                className="w-full min-h-20 rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={sourceConfig.quoteNote}
                onChange={(e) =>
                  setSourceConfig({
                    ...sourceConfig,
                    quoteNote: e.target.value,
                  })
                }
                placeholder="Ghi chú cho báo giá (ví dụ: giá theo số lượng, điều kiện giao hàng...)"
              />
            </div>
          </div>

          {/* Specs (có thể bỏ trống) */}
          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <h2 className="text-sm font-semibold text-gray-900">
                Thông số kỹ thuật
              </h2>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  className="h-8 rounded border border-gray-300 bg-white px-2 text-xs shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  value={selectedSpecDefId}
                  onChange={(e) => setSelectedSpecDefId(e.target.value)}
                >
                  <option value="">— Chọn thông số có sẵn —</option>
                  {specDefs.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleAddSpecFromDef}
                  className="text-xs rounded-lg border border-gray-300 bg-white px-2 py-1 font-medium text-gray-700 hover:bg-gray-50"
                >
                  + Thêm từ bảng
                </button>
                <button
                  type="button"
                  onClick={handleAddEmptySpec}
                  className="text-xs rounded-lg border border-gray-300 bg-white px-2 py-1 font-medium text-gray-700 hover:bg-gray-50"
                >
                  + Thêm mới
                </button>
                <button
                  onClick={handleSaveSpecs}
                  className="text-xs rounded-lg bg-blue-600 px-3 py-1.5 font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
                  disabled={saving}
                >
                  Lưu
                </button>
              </div>
            </div>

            {specList.length === 0 && (
              <div className="text-xs text-gray-400">
                Chưa có thông số. Chọn từ bảng hoặc bấm &quot;Thêm mới&quot;.
              </div>
            )}

            <div className="space-y-3">
              {specList.map((s, idx) => (
                <div
                  key={idx}
                  className="grid gap-2 rounded-md border border-gray-100 bg-gray-50 p-2 text-xs md:grid-cols-6"
                >
                  <div className="md:col-span-2">
                    <label className="text-[11px] font-medium text-gray-700">
                      Tên thông số
                    </label>
                    <input
                      className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-xs"
                      value={s.name}
                      onChange={(e) => {
                        const value = e.target.value;
                        setSpecList((prev) =>
                          prev.map((row, i) =>
                            i === idx ? { ...row, name: value } : row,
                          ),
                        );
                      }}
                      placeholder="VD: Tốc độ băng tải"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-[11px] font-medium text-gray-700">
                      Giá trị
                    </label>
                    <input
                      className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-xs"
                      value={s.valueString}
                      onChange={(e) => {
                        const value = e.target.value;
                        setSpecList((prev) =>
                          prev.map((row, i) =>
                            i === idx ? { ...row, valueString: value } : row,
                          ),
                        );
                      }}
                      placeholder="VD: 30 m/phút"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-gray-700">
                      Đơn vị
                    </label>
                    <input
                      className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-xs"
                      value={s.unitOverride}
                      onChange={(e) => {
                        const value = e.target.value;
                        setSpecList((prev) =>
                          prev.map((row, i) =>
                            i === idx
                              ? { ...row, unitOverride: value }
                              : row,
                          ),
                        );
                      }}
                      placeholder="VD: m/phút"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-gray-700">
                      Thứ tự
                    </label>
                    <input
                      type="number"
                      className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-xs"
                      value={s.sortOrder}
                      onChange={(e) => {
                        const value = e.target.value;
                        setSpecList((prev) =>
                          prev.map((row, i) =>
                            i === idx ? { ...row, sortOrder: value } : row,
                          ),
                        );
                      }}
                      placeholder={String(idx + 1)}
                    />
                  </div>
                  <div className="md:col-span-6">
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <textarea
                        className="w-full rounded border border-gray-300 px-2 py-1 text-xs"
                        value={s.note}
                        onChange={(e) => {
                          const value = e.target.value;
                          setSpecList((prev) =>
                            prev.map((row, i) =>
                              i === idx ? { ...row, note: value } : row,
                            ),
                          );
                        }}
                        placeholder="Ghi chú thêm (nếu có)"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setSpecList((prev) =>
                            prev.filter((_, i) => i !== idx),
                          )
                        }
                        className="shrink-0 rounded border border-red-200 bg-red-50 px-2 py-1 text-[11px] font-medium text-red-600 hover:bg-red-100"
                      >
                        Xóa
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT: Pricing / Stock / Media / Inventory Adv / Images */}
        <div className="space-y-4">
          {/* Pricing & stock (bắt buộc) */}
          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-gray-900">
                Giá, giá nhập & tồn kho
              </h2>
              <button
                onClick={() =>
                  handleUpdate({
                    price: Number(pricing.price || 0),
                    listPrice: pricing.listPrice
                      ? Number(pricing.listPrice)
                      : null,
                    costPrice: pricing.costPrice
                      ? Number(pricing.costPrice)
                      : null,
                    stockOnHand: pricing.stockOnHand
                      ? Number(pricing.stockOnHand)
                      : 0,
                    status,
                  })
                }
                className="text-xs rounded-lg bg-blue-600 px-3 py-1.5 font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
                disabled={saving}
              >
                Lưu
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-700">
                Giá bán (VND)
              </label>
              <input
                type="number"
                min="0"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={pricing.price}
                onChange={(e) =>
                  setPricing({ ...pricing, price: e.target.value })
                }
              />
            </div>

            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-700">
                  Giá niêm yết
                </label>
                <input
                  type="number"
                  min="0"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  value={pricing.listPrice}
                  onChange={(e) =>
                    setPricing({
                      ...pricing,
                      listPrice: e.target.value,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-700">
                  Giá nhập (Cost)
                </label>
                <input
                  type="number"
                  min="0"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  value={pricing.costPrice}
                  onChange={(e) =>
                    setPricing({
                      ...pricing,
                      costPrice: e.target.value,
                    })
                  }
                  placeholder="Giá nhập từ NCC"
                />
              </div>
            </div>

            <div className="mt-3 space-y-2">
              <label className="text-xs font-medium text-gray-700">
                Tồn kho
              </label>
              <input
                type="number"
                min="0"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={pricing.stockOnHand}
                onChange={(e) =>
                  setPricing({
                    ...pricing,
                    stockOnHand: e.target.value,
                  })
                }
              />
            </div>

            <div className="mt-3 space-y-2">
              <label className="text-xs font-medium text-gray-700">
                Trạng thái
              </label>
              <select
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={status}
                onChange={(e) =>
                  setStatus(e.target.value as ProductDetail["status"])
                }
              >
                <option value="DRAFT">DRAFT (Nháp)</option>
                <option value="PUBLISHED">PUBLISHED (Đang bán)</option>
                <option value="ARCHIVED">ARCHIVED (Lưu trữ)</option>
              </select>
            </div>

            <div className="mt-3 text-xs text-gray-500">
              Giá hiện tại hiển thị:{" "}
              {formatCurrency(product.price, currency)}
            </div>
          </div>

          {/* Advanced inventory – chỉ 2 field, có thể bỏ trống */}
          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-gray-900">
                Tồn kho nâng cao
              </h2>
                <button
                onClick={() => {
                  const payload: Record<string, unknown> = {};

                  const rl = inventoryAdv.reorderLevel.trim();
                  if (rl !== "") {
                    payload.reorderLevel = Number(rl);
                  }

                  const moq = inventoryAdv.minOrderQty.trim();
                  if (moq !== "") {
                    payload.minOrderQty = Number(moq);
                  }

                  return handleUpdate(payload);
                }}
                className="text-xs rounded-lg bg-blue-600 px-3 py-1.5 font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
                disabled={saving}
              >
                Lưu
              </button>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-700">
                  Mức cảnh báo tồn kho
                </label>
                <input
                  type="number"
                  min="0"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  value={inventoryAdv.reorderLevel}
                  onChange={(e) =>
                    setInventoryAdv({
                      ...inventoryAdv,
                      reorderLevel: e.target.value,
                    })
                  }
                  placeholder="VD: 10"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-700">
                  MOQ (Min order qty)
                </label>
                <input
                  type="number"
                  min="0"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  value={inventoryAdv.minOrderQty}
                  onChange={(e) =>
                    setInventoryAdv({
                      ...inventoryAdv,
                      minOrderQty: e.target.value,
                    })
                  }
                  placeholder="VD: 1"
                />
              </div>
            </div>
          </div>

          {/* Media (cover) – có thể bỏ trống */}
          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-gray-900">
                Hình ảnh chính
              </h2>
              <button
                onClick={() =>
                  handleUpdate({
                    coverImage: media.coverImage || null,
                  })
                }
                className="text-xs rounded-lg bg-blue-600 px-3 py-1.5 font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
                disabled={saving}
              >
                Lưu
              </button>
            </div>

            {media.coverImage ? (
              <div className="mb-3">
                <div className="relative h-64 w-full overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
                  <Image
                    src={media.coverImage}
                    alt={product.name}
                    fill
                    className="object-contain"
                  />
                </div>
                <div className="mt-1 text-xs text-gray-500">
                  Ảnh đang hiển thị trên trang sản phẩm.
                </div>
              </div>
            ) : (
              <div className="mb-3 flex h-32 items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 text-xs text-gray-400">
                Chưa có ảnh đại diện
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-700">
                URL ảnh đại diện
              </label>
              <div className="space-y-2">
                <input
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  value={media.coverImage}
                  onChange={(e) =>
                    setMedia({ coverImage: e.target.value })
                  }
                  placeholder="https://..."
                />
                <div className="flex flex-wrap gap-2 text-xs">
                  <button
                    type="button"
                    onClick={handleCoverUploadClick}
                    className="inline-flex items-center rounded-md bg-blue-600 px-3 py-1.5 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                    disabled={coverUploading}
                  >
                    {coverUploading ? "Đang tải..." : "Tải ảnh"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setMedia({ coverImage: "" })}
                    className="inline-flex items-center rounded-md border border-gray-300 px-3 py-1.5 font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Xoá URL
                  </button>
                </div>
                <input
                  ref={coverFileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleCoverFileChange}
                />
              </div>
            </div>
          </div>

          {/* Image gallery – có thể bỏ trống */}
          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-gray-900">
                Thư viện ảnh
              </h2>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleGalleryUploadClick}
                  className="text-xs rounded-lg border border-blue-200 bg-blue-50 px-2 py-1 font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-60"
                  disabled={galleryUploading}
                >
                  {galleryUploading ? "Đang tải..." : "Tải ảnh"}
                </button>
                <button
                  type="button"
                  onClick={addImageRow}
                  className="text-xs rounded-lg border border-gray-300 bg-white px-2 py-1 font-medium text-gray-700 hover:bg-gray-50"
                >
                  + Thêm ảnh
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleUpdate({
                      images: buildImagesPayload(),
                    })
                  }
                  className="text-xs rounded-lg bg-blue-600 px-3 py-1.5 font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
                  disabled={saving}
                >
                  Lưu
                </button>
              </div>
              <input
                ref={galleryFileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleGalleryFileChange}
              />
            </div>

            {imageList.length === 0 && (
              <div className="text-xs text-gray-400">
                Chưa có ảnh chi tiết. Bạn có thể thêm URL Cloudinary hoặc
                link ảnh khác.
              </div>
            )}

            <div className="space-y-3">
              {imageList.map((img, idx) => (
                <div
                  key={idx}
                  className="grid gap-2 rounded-md border border-gray-100 bg-gray-50 p-2 text-xs md:grid-cols-6"
                >
                  <div className="md:col-span-3">
                    <label className="text-[11px] font-medium text-gray-700">
                      URL ảnh
                    </label>
                    <input
                      className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-xs"
                      value={img.url}
                      onChange={(e) => {
                        const value = e.target.value;
                        setImageList((prev) =>
                          prev.map((row, i) =>
                            i === idx ? { ...row, url: value } : row,
                          ),
                        );
                      }}
                      placeholder="https://..."
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-[11px] font-medium text-gray-700">
                      Alt text
                    </label>
                    <input
                      className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-xs"
                      value={img.alt}
                      onChange={(e) => {
                        const value = e.target.value;
                        setImageList((prev) =>
                          prev.map((row, i) =>
                            i === idx ? { ...row, alt: value } : row,
                          ),
                        );
                      }}
                      placeholder="Mô tả ảnh cho SEO"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-gray-700">
                      Thứ tự
                    </label>
                    <input
                      type="number"
                      className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-xs"
                      value={img.sortOrder}
                      onChange={(e) => {
                        const value = e.target.value;
                        setImageList((prev) =>
                          prev.map((row, i) =>
                            i === idx ? { ...row, sortOrder: value } : row,
                          ),
                        );
                      }}
                      placeholder={String(idx + 1)}
                    />
                  </div>
                  <div className="md:col-span-6">
                    <div className="mt-2 flex items-center justify-between gap-3">
                      {img.url ? (
                        <div className="relative h-20 w-20 overflow-hidden rounded border border-gray-200 bg-white">
                          <Image
                            src={img.url}
                            alt={img.alt || "preview"}
                            fill
                            className="object-cover"
                          />
                        </div>
                      ) : (
                        <div className="flex h-20 w-20 items-center justify-center rounded border border-dashed border-gray-300 bg-white text-[10px] text-gray-400">
                          Không preview
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() =>
                          setImageList((prev) =>
                            prev.filter((_, i) => i !== idx),
                          )
                        }
                        className="rounded border border-red-200 bg-red-50 px-2 py-1 text-[11px] font-medium text-red-600 hover:bg-red-100"
                      >
                        Xóa ảnh
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Meta / debug */}
      <div className="rounded-lg border border-gray-200 bg-white p-4 text-xs text-gray-600 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-4">
          <div>
            <div className="text-gray-500">ID</div>
            <div className="mt-1 break-all font-mono">{product.id}</div>
          </div>
          <div>
            <div className="text-gray-500">Slug</div>
            <div className="mt-1 break-all font-mono">{product.slug}</div>
          </div>
          <div>
            <div className="text-gray-500">Tạo lúc</div>
            <div className="mt-1">{formatDate(product.createdAt)}</div>
          </div>
          <div>
            <div className="text-gray-500">Cập nhật</div>
            <div className="mt-1">{formatDate(product.updatedAt)}</div>
          </div>
        </div>
      </div>
      <ImageCropDialog
        open={coverCropOpen && Boolean(coverCropSource?.url)}
        imageSrc={coverCropSource?.url ?? null}
        fileName={coverCropSource?.fileName}
        aspectRatio={4 / 3}
        onOpenChange={handleCoverDialogOpenChange}
        onComplete={handleCoverCropComplete}
      />
      <ImageCropDialog
        open={galleryCropOpen && Boolean(galleryCropSource?.url)}
        imageSrc={galleryCropSource?.url ?? null}
        fileName={galleryCropSource?.fileName}
        aspectRatio={4 / 3}
        onOpenChange={handleGalleryDialogOpenChange}
        onComplete={handleGalleryCropComplete}
      />
    </div>
  );
}

function getErrorMessage(payload: unknown, fallback: string) {
  if (payload && typeof payload === "object" && "error" in payload) {
    const value = (payload as { error?: unknown }).error;
    if (typeof value === "string") return value;
  }
  return fallback;
}

function extractErrorMessage(error: unknown) {
  if (error instanceof Error) {
    try {
      const parsed = JSON.parse(error.message);
      if (parsed && typeof parsed.error === "string") return parsed.error;
    } catch {
      // ignore
    }
    return error.message || "Đã có lỗi xảy ra";
  }
  return "Đã có lỗi xảy ra";
}
