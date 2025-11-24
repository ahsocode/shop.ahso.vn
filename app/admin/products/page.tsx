"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";
import { ImageCropDialog } from "@/components/image/image-crop-dialog";
import { getJSON, postJSON, makeHeaders } from "../_lib/fetcher";

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

type ListResp<T> = {
  data: T[];
  meta: { total: number; page: number; pageSize: number };
};

type Option = { id: string; name: string };

// Thông số kỹ thuật có sẵn trong hệ thống
type SpecDefOption = {
  id: string;
  name: string;
  slug: string;
};

// Dòng thông số kỹ thuật nhập trên UI
type SpecRow = {
  id: number;
  definitionId?: string | null; // chọn spec có sẵn
  name: string;                 // tên thực tế gửi xuống API
  value: string;
  unit: string;
  note: string;
};

// Dòng ảnh gallery
type ImageRow = {
  id: number;
  url: string;
  alt: string;
  sortOrder: string; // nhập string, khi gửi convert sang number
};

const formatDate = (iso?: string) =>
  iso
    ? new Intl.DateTimeFormat("vi-VN", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(iso))
    : "—";

const formatCurrency = (value?: string | number, currency = "VND") => {
  const num = typeof value === "string" ? Number(value) : value ?? 0;
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(num);
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
  status: "DRAFT" as "DRAFT" | "PUBLISHED" | "ARCHIVED",
  description: "",
  taxRate: "0.10",
  taxIncluded: true,
  stockOnHand: "",
  reorderLevel: "",
  minOrderQty: "",
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
  const [specDefs, setSpecDefs] = useState<SpecDefOption[]>([]); // ⬅️ danh sách spec có sẵn

  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [creating, setCreating] = useState(false);
  const [loadingList, setLoadingList] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  // bảng thông số kỹ thuật
  const [specRows, setSpecRows] = useState<SpecRow[]>([
    { id: 1, name: "", value: "", unit: "", note: "" },
  ]);

  // bảng ảnh gallery
  const [imageRows, setImageRows] = useState<ImageRow[]>([
    { id: 1, url: "", alt: "", sortOrder: "" },
  ]);
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
  const [galleryTargetId, setGalleryTargetId] = useState<number | null>(null);
  const [galleryUploadingId, setGalleryUploadingId] = useState<number | null>(null);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const triggerReload = () => setReloadToken((token) => token + 1);

  const ensureUploadPrerequisites = () => {
    if (!form.typeId) {
      toast.error("Vui lòng chọn loại sản phẩm trước khi tải ảnh");
      return false;
    }
    if (!form.sku.trim()) {
      toast.error("Vui lòng nhập SKU trước khi tải ảnh");
      return false;
    }
    return true;
  };

  const uploadTempImage = async (
    file: File,
    kind: "cover" | "gallery",
    sequence?: number,
  ) => {
    if (!ensureUploadPrerequisites()) {
      throw new Error("Thiếu thông tin sản phẩm");
    }
    const fd = new FormData();
    fd.append("file", file);
    fd.append("typeId", form.typeId);
    fd.append("sku", form.sku.trim());
    fd.append("kind", kind);
    if (sequence !== undefined) {
      fd.append("sequence", String(sequence));
    }
    const res = await fetch("/api/admin/products/upload-temp", {
      method: "POST",
      headers: makeHeaders(),
      body: fd,
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(getErrorMessage(data, "Không thể tải ảnh"));
    }
    return (data?.data?.url as string) ?? "";
  };

  // load options (types, brands, suppliers, spec definitions)
  useEffect(() => {
    let ignore = false;
    const fetchOptions = async () => {
      try {
        const [typesResp, brandsResp, supplierResp, specDefResp] =
          await Promise.all([
            getJSON<ListResp<Option>>(
              "/api/admin/product-types?page=1&pageSize=200",
            ),
            getJSON<ListResp<Option>>(
              "/api/admin/brands?page=1&pageSize=200",
            ),
            getJSON<ListResp<{ id: string; name: string }>>(
              "/api/admin/suppliers?page=1&pageSize=200",
            ),
            // API mới: list definitions
            getJSON<ListResp<SpecDefOption>>(
              "/api/admin/spec-defs?page=1&pageSize=200",
            ),
          ]);

        if (ignore) return;
        setTypes(typesResp.data);
        setBrands(brandsResp.data);
        setSuppliers(supplierResp.data);
        setSpecDefs(specDefResp.data);

      setForm((prev) => ({
        ...prev,
        typeId: prev.typeId || typesResp.data[0]?.id || "",
        brandId: prev.brandId || "",
      }));
      } catch (err) {
        console.error("Failed to load product options", err);
      }
    };
    fetchOptions();
    return () => {
      ignore = true;
    };
  }, []);

  // ensure default typeId khi types load xong
  useEffect(() => {
    if (types.length && !form.typeId) {
      setForm((prev) => ({ ...prev, typeId: types[0].id }));
    }
  }, [types, form.typeId]);

  // load product list
  useEffect(() => {
    let ignore = false;
    const fetchProducts = async () => {
      setLoadingList(true);
      try {
        const params = new URLSearchParams({
          q: searchQuery,
          page: String(page),
          pageSize: String(pageSize),
        });
        const json = await getJSON<ListResp<Row>>(
          `/api/admin/products?${params.toString()}`,
        );
        if (ignore) return;
        setRows(json.data);
        setTotal(json.meta.total);
      } finally {
        if (!ignore) setLoadingList(false);
      }
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

  const resetForm = () => {
    setForm({
      ...DEFAULT_FORM,
      typeId: types[0]?.id || "",
    });
    setSpecRows([{ id: 1, name: "", value: "", unit: "", note: "" }]);
    setImageRows([{ id: 1, url: "", alt: "", sortOrder: "" }]);
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

      // map specRows -> specs gửi xuống API
      const specsPayload = specRows
        .filter(
          (s) =>
            s.name.trim() &&
            (s.value.trim() || s.unit.trim() || s.note.trim()),
        )
        .map((s, idx) => ({
          name: s.name.trim(), // dùng name, backend tự upsert definition theo slug
          valueString: s.value.trim() || undefined,
          unitOverride: s.unit.trim() || undefined,
          note: s.note.trim() || undefined,
          sortOrder: idx,
        }));

      // map imageRows -> images gửi xuống API
      const imagesPayload = imageRows
        .filter((img) => img.url.trim())
        .map((img, idx) => {
          const sort = img.sortOrder.trim();
          const sortNum = sort ? Number(sort) : idx;
          return {
            url: img.url.trim(),
            alt: img.alt.trim() || undefined,
            sortOrder: Number.isFinite(sortNum) ? sortNum : idx,
          };
        });

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
        minOrderQty: parseNumber(form.minOrderQty),
        coverImage: form.coverImage || undefined,
        status: form.status as Row["status"],
        description: form.description || undefined,
        images: imagesPayload,
        specs: specsPayload,
      });

      resetForm();
      triggerReload();
    } finally {
      setCreating(false);
    }
  };

  const canSubmit = Boolean(
    form.name.trim() &&
      form.sku.trim() &&
      form.typeId &&
      (form.requiresQuote || form.price),
  );

  const addSpecRow = () => {
    setSpecRows((rows) => [
      ...rows,
      {
        id: rows.length ? rows[rows.length - 1].id + 1 : 1,
        name: "",
        value: "",
        unit: "",
        note: "",
      },
    ]);
  };

  const removeSpecRow = (id: number) => {
    setSpecRows((rows) =>
      rows.length <= 1 ? rows : rows.filter((r) => r.id !== id),
    );
  };

  const updateSpecRow = (id: number, patch: Partial<SpecRow>) => {
    setSpecRows((rows) =>
      rows.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    );
  };

  const addImageRow = () => {
    setImageRows((rows) => [
      ...rows,
      {
        id: rows.length ? rows[rows.length - 1].id + 1 : 1,
        url: "",
        alt: "",
        sortOrder: "",
      },
    ]);
  };

  const removeImageRow = (id: number) => {
    setImageRows((rows) =>
      rows.length <= 1 ? rows : rows.filter((r) => r.id !== id),
    );
  };

  const updateImageRow = (id: number, patch: Partial<ImageRow>) => {
    setImageRows((rows) =>
      rows.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    );
  };

  const handleCoverUploadClick = () => {
    if (!ensureUploadPrerequisites()) return;
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

  const handleCoverCropComplete = async (result: {
    file: File;
    previewUrl: string;
  }) => {
    setCoverCropOpen(false);
    setCoverUploading(true);
    try {
      const url = await uploadTempImage(result.file, "cover", 0);
      setForm((prev) => ({ ...prev, coverImage: url }));
      toast.success("Đã tải ảnh đại diện");
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

  const handleGalleryUploadClick = (rowId: number) => {
    if (!ensureUploadPrerequisites()) return;
    setGalleryTargetId(rowId);
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

  const handleGalleryCropComplete = async (result: {
    file: File;
    previewUrl: string;
  }) => {
    const rowId = galleryTargetId;
    setGalleryCropOpen(false);
    if (rowId === null) return;
    setGalleryUploadingId(rowId);
    try {
      const row = imageRows.find((r) => r.id === rowId);
      let sequence: number | undefined;
      if (row?.sortOrder && row.sortOrder.trim()) {
        const parsed = Number(row.sortOrder.trim());
        if (Number.isFinite(parsed)) sequence = parsed;
      }
      if (sequence === undefined) {
        const idx = imageRows.findIndex((r) => r.id === rowId);
        if (idx >= 0) sequence = idx + 1;
      }
      const url = await uploadTempImage(result.file, "gallery", sequence);
      updateImageRow(rowId, { url });
      toast.success("Đã tải ảnh gallery");
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
      setGalleryUploadingId(null);
      setGalleryTargetId(null);
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

  // ===== JSX =====
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Quản lý sản phẩm
          </h1>
          <p className="text-sm text-gray-500">
            Danh sách sản phẩm đang bán trên AHSO Industrial. Tổng:{" "}
            <span className="font-semibold text-gray-700">{total}</span> sản
            phẩm.
          </p>
        </div>

        <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
          <div className="flex w-full max-w-md items-center gap-2">
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Tìm theo tên hoặc SKU..."
              className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <button
              onClick={handleSearch}
              className="inline-flex items-center rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
            >
              Tìm
            </button>
          </div>
          <button
            onClick={() => setShowCreate((v) => !v)}
            className="inline-flex items-center justify-center rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-1"
          >
            {showCreate ? "Ẩn form tạo" : "Thêm sản phẩm"}
          </button>
        </div>
      </div>

      {/* Bảng sản phẩm */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
          <div className="font-semibold text-gray-800">
            Sản phẩm{" "}
            <span className="text-sm font-normal text-gray-500">
              (hiển thị {rows.length}/{total})
            </span>
          </div>
          {loadingList && (
            <div className="text-xs text-gray-400">Đang tải dữ liệu...</div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
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
            <tbody className="divide-y divide-gray-100">
              {rows.map((r) => {
                const cost = toNumberOrNull(r.costPrice);
                const sale = toNumberOrNull(r.price) ?? 0;
                const profit = cost != null ? sale - cost : null;

                return (
                  <tr
                    key={r.id}
                    className="transition-colors hover:bg-gray-50/70"
                  >
                    <td className="px-3 py-2 align-top">
                      {r.coverImage ? (
                        <div className="relative h-14 w-14 overflow-hidden rounded-md border border-gray-200 bg-white">
                          <Image
                            src={r.coverImage}
                            alt={r.name}
                            fill
                            className="object-cover"
                          />
                        </div>
                      ) : (
                        <div className="flex h-14 w-14 items-center justify-center rounded-md border border-dashed border-gray-300 bg-gray-50 text-[10px] text-gray-400">
                          Không ảnh
                        </div>
                      )}
                    </td>

                    <td className="px-3 py-2 align-top">
                      <Link
                        href={`/admin/products/${r.id}`}
                        className="line-clamp-2 text-sm font-semibold text-gray-900 hover:text-blue-600 hover:underline"
                      >
                        {r.name}
                      </Link>
                      <div className="mt-1 text-xs text-gray-500">
                        {r.brand?.name || "—"}
                      </div>
                    </td>

                    <td className="px-3 py-2 align-top text-sm">
                      <div className="font-mono text-xs text-gray-900">
                        {r.sku}
                      </div>
                      <div className="mt-1 text-xs text-gray-500">
                        {r.type?.name || "—"}
                      </div>
                    </td>

                    <td className="px-3 py-2 align-top text-sm">
                      <div className="truncate text-gray-800">
                        {r.supplier?.name || "—"}
                      </div>
                      {r.supplierSku && (
                        <div className="mt-1 text-xs text-gray-500">
                          SKU NCC: {r.supplierSku}
                        </div>
                      )}
                    </td>

                    <td className="px-3 py-2 align-top text-right">
                      {r.requiresQuote ? (
                        <div className="text-xs text-amber-600">
                          Báo giá riêng
                        </div>
                      ) : (
                        <div className="font-medium text-gray-900">
                          {formatCurrency(r.price, r.currency || "VND")}
                        </div>
                      )}
                      {r.listPrice && (
                        <div className="mt-1 text-xs text-gray-500">
                          Niêm yết:{" "}
                          {formatCurrency(
                            r.listPrice,
                            r.currency || "VND",
                          )}
                        </div>
                      )}
                    </td>

                    <td className="px-3 py-2 align-top text-right text-sm">
                      {cost != null ? (
                        <>
                          <div>
                            {formatCurrency(
                              cost,
                              r.currency || "VND",
                            )}
                          </div>
                          {profit != null && (
                            <div className="mt-1 text-xs text-gray-500">
                              Lãi:{" "}
                              {formatCurrency(
                                profit,
                                r.currency || "VND",
                              )}
                            </div>
                          )}
                        </>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>

                    <td className="px-3 py-2 align-top text-center text-sm">
                      <div className="font-medium text-gray-900">
                        {r.stockOnHand ?? 0}
                      </div>
                      {r.reorderLevel != null && (
                        <div className="mt-1 text-xs text-gray-500">
                          Cảnh báo: {r.reorderLevel}
                        </div>
                      )}
                      {r.minOrderQty != null && (
                        <div className="mt-1 text-xs text-gray-500">
                          MOQ: {r.minOrderQty}
                        </div>
                      )}
                    </td>

                    <td className="px-3 py-2 align-top text-sm">
                      {r.requiresQuote ? (
                        <span className="inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 ring-1 ring-amber-100">
                          Cần báo giá
                        </span>
                      ) : (
                        <span className="text-xs text-gray-500">
                          Bán trực tiếp
                        </span>
                      )}
                      {r.quoteNote && (
                        <div className="mt-1 line-clamp-2 text-xs text-gray-500">
                          {r.quoteNote}
                        </div>
                      )}
                    </td>

                    <td className="px-3 py-2 align-top text-center text-xs">
                      <span
                        className={[
                          "inline-flex rounded-full px-2 py-0.5 font-medium",
                          r.status === "PUBLISHED"
                            ? "bg-green-50 text-green-700 ring-1 ring-green-100"
                            : r.status === "ARCHIVED"
                            ? "bg-gray-100 text-gray-700 ring-1 ring-gray-200"
                            : "bg-yellow-50 text-yellow-700 ring-1 ring-yellow-100",
                        ].join(" ")}
                      >
                        {r.status}
                      </span>
                    </td>

                    <td className="px-3 py-2 align-top text-xs text-gray-500">
                      {formatDate(r.createdAt)}
                    </td>
                    <td className="px-3 py-2 align-top text-xs text-gray-500">
                      {formatDate(r.updatedAt)}
                    </td>
                  </tr>
                );
              })}

              {!rows.length && !loadingList && (
                <tr>
                  <td
                    className="px-3 py-6 text-center text-sm text-gray-500"
                    colSpan={11}
                  >
                    Không có dữ liệu
                  </td>
                </tr>
              )}

              {loadingList && !rows.length && (
                <tr>
                  <td
                    colSpan={11}
                    className="px-3 py-6 text-center text-sm text-gray-400"
                  >
                    Đang tải dữ liệu...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3 text-sm text-gray-600">
          <div>
            Trang{" "}
            <span className="font-semibold">
              {page}/{totalPages}
            </span>{" "}
            · {total} sản phẩm
          </div>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-lg border border-gray-300 bg-white px-3 py-1 text-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Trước
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-1 text-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Sau
            </button>
          </div>
        </div>
      </div>

      {/* Form tạo nhanh – ẩn/hiện bằng nút */}
      {showCreate && (
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-gray-100 pb-3">
            <div>
              <div className="text-base font-semibold text-gray-900">
                Thêm sản phẩm nhanh
              </div>
              <p className="text-xs text-gray-500">
                Nhập tối thiểu tên, SKU, loại sản phẩm và giá (hoặc chọn
                &quot;Cần báo giá&quot;). Có thể chọn thông số kỹ thuật có sẵn
                hoặc tạo mới, và thêm nhiều ảnh.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={resetForm}
                className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
              >
                Xoá form
              </button>
              <button
                onClick={handleCreate}
                disabled={!canSubmit || creating}
                className="inline-flex items-center rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {creating ? "Đang tạo..." : "Thêm sản phẩm"}
              </button>
            </div>
          </div>

          {/* ==== FORM CHÍNH ==== */}
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {/* Tên + SKU */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Tên sản phẩm <span className="text-red-500">*</span>
              </label>
              <input
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={form.name}
                onChange={(e) =>
                  setForm({ ...form, name: e.target.value })
                }
                placeholder="VD: Băng tải PVC 800x4000mm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                SKU nội bộ <span className="text-red-500">*</span>
              </label>
              <input
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={form.sku}
                onChange={(e) =>
                  setForm({ ...form, sku: e.target.value })
                }
                placeholder="Mã sản phẩm duy nhất"
              />
            </div>

            {/* Slug + Type */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Slug
              </label>
              <input
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={form.slug}
                onChange={(e) =>
                  setForm({ ...form, slug: e.target.value })
                }
                placeholder="Tự tạo nếu bỏ trống"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Loại sản phẩm <span className="text-red-500">*</span>
              </label>
              <select
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={form.typeId}
                onChange={(e) =>
                  setForm({ ...form, typeId: e.target.value })
                }
              >
                <option value="">Chọn loại</option>
                {types.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Brand + Supplier */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Thương hiệu
              </label>
              <select
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={form.brandId}
                onChange={(e) =>
                  setForm({ ...form, brandId: e.target.value })
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
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Nhà cung cấp
              </label>
              <select
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={form.supplierId}
                onChange={(e) =>
                  setForm({ ...form, supplierId: e.target.value })
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

            {/* Supplier SKU + Giá */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                SKU nhà cung cấp
              </label>
              <input
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={form.supplierSku}
                onChange={(e) =>
                  setForm({ ...form, supplierSku: e.target.value })
                }
                placeholder="Mã sản phẩm phía NCC"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Giá bán{" "}
                {form.requiresQuote ? null : (
                  <span className="text-red-500">*</span>
                )}
              </label>
              <input
                type="number"
                min="0"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={form.price}
                onChange={(e) =>
                  setForm({ ...form, price: e.target.value })
                }
                placeholder="Giá bán (VND)"
                disabled={form.requiresQuote}
              />
            </div>

            {/* List price + Cost price */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Giá niêm yết
              </label>
              <input
                type="number"
                min="0"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={form.listPrice}
                onChange={(e) =>
                  setForm({ ...form, listPrice: e.target.value })
                }
                placeholder="Có thể bỏ trống"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Giá nhập (Cost)
              </label>
              <input
                type="number"
                min="0"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={form.costPrice}
                onChange={(e) =>
                  setForm({ ...form, costPrice: e.target.value })
                }
                placeholder="Giá nhập từ NCC"
              />
            </div>

            {/* Requires quote + note */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Báo giá
              </label>
              <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.requiresQuote}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      requiresQuote: e.target.checked,
                    })
                  }
                />
                <span>Cần báo giá riêng (không hiển thị giá trên web)</span>
              </div>
              <textarea
                className="min-h-20 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={form.quoteNote}
                onChange={(e) =>
                  setForm({ ...form, quoteNote: e.target.value })
                }
                placeholder="Ghi chú cho báo giá (ví dụ: giá theo số lượng, điều kiện giao hàng...)"
              />
            </div>

            {/* Thuế + ảnh + status */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Thuế VAT
              </label>
              <input
                type="number"
                step="0.01"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={form.taxRate}
                onChange={(e) =>
                  setForm({ ...form, taxRate: e.target.value })
                }
                placeholder="0.10 = 10%"
              />
              <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={form.taxIncluded}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      taxIncluded: e.target.checked,
                    })
                  }
                />
                Giá hiển thị đã bao gồm VAT
              </label>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Ảnh đại diện
              </label>
              <div className="space-y-2">
                <input
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  value={form.coverImage}
                  onChange={(e) =>
                    setForm({ ...form, coverImage: e.target.value })
                  }
                  placeholder="https://..."
                />
                <div className="flex flex-wrap gap-2 text-xs">
                  <button
                    type="button"
                    onClick={handleCoverUploadClick}
                    className="inline-flex items-center rounded-md bg-blue-600 px-3 py-1.5 font-medium text-white hover:bg-blue-700 disabled:opacity-60"
                    disabled={coverUploading}
                  >
                    {coverUploading ? "Đang tải..." : "Tải ảnh"}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setForm((prev) => ({ ...prev, coverImage: "" }))
                    }
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
              <label className="text-sm font-medium text-gray-700">
                Trạng thái
              </label>
              <select
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={form.status}
                onChange={(e) =>
                  setForm({
                    ...form,
                    status: e.target.value as FormState["status"],
                  })
                }
              >
                <option value="DRAFT">DRAFT (Nháp)</option>
                <option value="PUBLISHED">PUBLISHED (Đang bán)</option>
                <option value="ARCHIVED">ARCHIVED (Lưu trữ)</option>
              </select>
            </div>

            {/* Tồn kho / MOQ / ReorderLevel */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Tồn kho ban đầu
              </label>
              <input
                type="number"
                min="0"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={form.stockOnHand}
                onChange={(e) =>
                  setForm({ ...form, stockOnHand: e.target.value })
                }
                placeholder="0"
              />
              <label className="text-sm font-medium text-gray-700">
                Mức cảnh báo tồn kho
              </label>
              <input
                type="number"
                min="0"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={form.reorderLevel}
                onChange={(e) =>
                  setForm({ ...form, reorderLevel: e.target.value })
                }
                placeholder="VD: 10"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                MOQ (Min order qty)
              </label>
              <input
                type="number"
                min="0"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={form.minOrderQty}
                onChange={(e) =>
                  setForm({ ...form, minOrderQty: e.target.value })
                }
                placeholder="VD: 1"
              />
            </div>

            {/* Mô tả */}
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-gray-700">
                Mô tả ngắn
              </label>
              <textarea
                className="min-h-[120px] w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                placeholder="Giới thiệu tổng quan, điểm nổi bật..."
              />
            </div>
          </div>

          {form.coverImage && (
            <div className="mt-4 flex items-center gap-4">
              <span className="text-sm text-gray-600">Xem thử ảnh:</span>
              <div className="relative h-24 w-24 overflow-hidden rounded-md border border-gray-200 bg-white">
                <Image
                  src={form.coverImage}
                  alt="Preview"
                  fill
                  className="object-cover"
                />
              </div>
            </div>
          )}

          {/* Bảng ảnh gallery */}
          <div className="mt-6 space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-800">
                Ảnh sản phẩm (gallery)
              </h3>
              <button
                type="button"
                onClick={addImageRow}
                className="text-xs font-medium text-blue-600 hover:underline"
              >
                + Thêm dòng ảnh
              </button>
            </div>
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full text-xs">
                <thead className="bg-gray-50 text-[11px] uppercase text-gray-500">
                  <tr>
                    <th className="px-2 py-1 text-left">URL ảnh</th>
                    <th className="px-2 py-1 text-left">Alt text</th>
                    <th className="px-2 py-1 text-center">Thứ tự</th>
                    <th className="px-2 py-1 text-center">Xoá</th>
                  </tr>
                </thead>
                <tbody>
                  {imageRows.map((img) => (
                    <tr key={img.id} className="border-t border-gray-100">
                    <td className="px-2 py-1">
                      <div className="flex gap-2">
                        <input
                          className="w-full rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          value={img.url}
                          onChange={(e) =>
                            updateImageRow(img.id, {
                              url: e.target.value,
                            })
                          }
                          placeholder="https://..."
                        />
                        <button
                          type="button"
                          onClick={() => handleGalleryUploadClick(img.id)}
                          className="shrink-0 rounded border border-blue-200 bg-blue-50 px-2 py-1 text-[11px] font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50"
                          disabled={
                            galleryUploadingId !== null &&
                            galleryUploadingId !== img.id
                          }
                        >
                          {galleryUploadingId === img.id
                            ? "Đang tải..."
                            : "Upload"}
                        </button>
                      </div>
                    </td>
                      <td className="px-2 py-1">
                        <input
                          className="w-full rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          value={img.alt}
                          onChange={(e) =>
                            updateImageRow(img.id, {
                              alt: e.target.value,
                            })
                          }
                          placeholder="Mô tả ngắn cho ảnh"
                        />
                      </td>
                      <td className="px-2 py-1 text-center">
                        <input
                          type="number"
                          className="w-20 rounded border border-gray-300 px-2 py-1 text-xs text-center focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          value={img.sortOrder}
                          onChange={(e) =>
                            updateImageRow(img.id, {
                              sortOrder: e.target.value,
                            })
                          }
                          placeholder="Auto"
                        />
                      </td>
                      <td className="px-2 py-1 text-center">
                        <button
                          type="button"
                          onClick={() => removeImageRow(img.id)}
                          className="text-xs text-red-600 hover:underline disabled:text-gray-400"
                          disabled={imageRows.length <= 1}
                        >
                          Xoá
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
          </table>
          <input
            ref={galleryFileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleGalleryFileChange}
          />
        </div>
            <p className="text-[11px] text-gray-500">
              Ảnh đầu tiên sẽ được dùng làm ảnh mặc định nếu bạn không nhập
              &quot;Ảnh đại diện&quot; phía trên.
            </p>
          </div>

          {/* Bảng thông số kỹ thuật */}
          <div className="mt-6 space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-800">
                Thông số kỹ thuật
              </h3>
              <button
                type="button"
                onClick={addSpecRow}
                className="text-xs font-medium text-blue-600 hover:underline"
              >
                + Thêm dòng thông số
              </button>
            </div>
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="min-w-full text-xs">
                <thead className="bg-gray-50 text-[11px] uppercase text-gray-500">
                  <tr>
                    <th className="px-2 py-1 text-left">Thông số</th>
                    <th className="px-2 py-1 text-left">Giá trị</th>
                    <th className="px-2 py-1 text-left">Đơn vị</th>
                    <th className="px-2 py-1 text-left">Ghi chú</th>
                    <th className="px-2 py-1 text-center">Xoá</th>
                  </tr>
                </thead>
                <tbody>
                  {specRows.map((s) => (
                    <tr key={s.id} className="border-t border-gray-100">
                      <td className="px-2 py-1">
                        {/* chọn spec có sẵn */}
                        <select
                          className="mb-1 w-full rounded border border-gray-300 px-2 py-1 text-[11px] focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          value={s.definitionId || ""}
                          onChange={(e) => {
                            const defId = e.target.value || null;
                            const def = specDefs.find(
                              (d) => d.id === defId,
                            );
                            updateSpecRow(s.id, {
                              definitionId: defId,
                              name: def?.name || "",
                            });
                          }}
                        >
                          <option value="">
                            — Chọn thông số có sẵn —
                          </option>
                          {specDefs.map((d) => (
                            <option key={d.id} value={d.id}>
                              {d.name}
                            </option>
                          ))}
                        </select>
                        {/* hoặc gõ tên mới */}
                        <input
                          className="w-full rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          value={s.name}
                          onChange={(e) =>
                            updateSpecRow(s.id, {
                              name: e.target.value,
                              // nếu tự sửa tên thì coi như không gắn với definitionId nữa
                              definitionId: undefined,
                            })
                          }
                          placeholder="VD: Chiều dài, Công suất motor..."
                        />
                      </td>
                      <td className="px-2 py-1">
                        <input
                          className="w-full rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          value={s.value}
                          onChange={(e) =>
                            updateSpecRow(s.id, {
                              value: e.target.value,
                            })
                          }
                          placeholder="VD: 800, 1.5, PVC trắng..."
                        />
                      </td>
                      <td className="px-2 py-1">
                        <input
                          className="w-full rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          value={s.unit}
                          onChange={(e) =>
                            updateSpecRow(s.id, {
                              unit: e.target.value,
                            })
                          }
                          placeholder="mm, kW, kg/m2..."
                        />
                      </td>
                      <td className="px-2 py-1">
                        <input
                          className="w-full rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          value={s.note}
                          onChange={(e) =>
                            updateSpecRow(s.id, {
                              note: e.target.value,
                            })
                          }
                          placeholder="Ghi chú thêm (nếu có)"
                        />
                      </td>
                      <td className="px-2 py-1 text-center">
                        <button
                          type="button"
                          onClick={() => removeSpecRow(s.id)}
                          className="text-xs text-red-600 hover:underline disabled:text-gray-400"
                          disabled={specRows.length <= 1}
                        >
                          Xoá
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[11px] text-gray-500">
              Nếu chọn từ danh sách, thông số sẽ dùng lại definition sẵn có
              (tên thống nhất). Nếu gõ tên mới, hệ thống sẽ tự tạo definition
              mới khi lưu sản phẩm.
            </p>
          </div>
        </div>
      )}
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
      if (parsed && typeof parsed.error === "string") {
        return parsed.error;
      }
    } catch {
      // ignore
    }
    return error.message || "Đã có lỗi xảy ra";
  }
  return "Đã có lỗi xảy ra";
}
