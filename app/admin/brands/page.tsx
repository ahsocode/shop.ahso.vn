"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Loader2, Upload, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { confirmToast } from "@/lib/confirm-toast";
import { ImageCropDialog } from "@/components/image/image-crop-dialog";
import { getJSON, postJSON, del, patchJSON, makeHeaders } from "../_lib/fetcher";

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

type ListResp = {
  data: Brand[];
  meta: { total: number; page: number; pageSize: number };
};

type BrandDraft = {
  tempId: string;
  name: string;
  slug: string;
  summary: string;
  logoUrl: string;
  mode: "create" | "update";
  issues: string[];
  logoFile?: File;
};

type BulkBrandPreviewRow = {
  tempId?: string;
  name?: string | null;
  slug?: string | null;
  summary?: string | null;
  logoUrl?: string | null;
  mode?: "create" | "update";
  issues?: string[];
};

type BrandLogoAsset = {
  assetId: string;
  publicId: string;
  secureUrl: string;
  width: number;
  height: number;
  bytes: number;
  createdAt: string;
};

const formatDate = (iso: string) =>
  new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));

export default function BrandsPage() {
  const pageSize = 20;
  const [keyword, setKeyword] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<Brand[]>([]);
  const [total, setTotal] = useState(0);
  const [form, setForm] = useState({
    name: "",
    slug: "",
    logoUrl: "",
    summary: "",
  });
  const [loading, setLoading] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const [editing, setEditing] = useState<Brand | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    slug: "",
    logoUrl: "",
    summary: "",
  });
  const [createLoading, setCreateLoading] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Brand | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const logoFileRef = useRef<File | null>(null);
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoCropOpen, setLogoCropOpen] = useState(false);
  const [logoCropSource, setLogoCropSource] = useState<{
    url: string;
    fileName: string;
    revokeOnClose: boolean;
  } | null>(null);
  const editLogoFileInputRef = useRef<HTMLInputElement | null>(null);

  // ===== Bulk import state =====
  const [drafts, setDrafts] = useState<BrandDraft[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importProgress, setImportProgress] = useState<{
    step: "idle" | "commit" | "upload_logos";
    current: number;
    total: number;
  } | null>(null);
  const bulkFileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedDraftIds, setSelectedDraftIds] = useState<string[]>([]);
  const [logoGalleryOpen, setLogoGalleryOpen] = useState(false);
  const [logoGalleryItems, setLogoGalleryItems] = useState<BrandLogoAsset[]>([]);
  const [logoGalleryLoading, setLogoGalleryLoading] = useState(false);
  const [logoGalleryCursor, setLogoGalleryCursor] = useState<string | null>(null);
  const [logoGalleryError, setLogoGalleryError] = useState<string | null>(null);
  const [logoUpdating, setLogoUpdating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);

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
        const json = await getJSON<ListResp>(
          `/api/admin/brands?${params.toString()}`,
        );
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

  useEffect(() => {
    if (!editing) {
      setLogoGalleryOpen(false);
      setLogoGalleryItems([]);
      setLogoGalleryCursor(null);
      setLogoGalleryError(null);
      setLogoUpdating(false);
    }
  }, [editing]);

  const handleSearch = () => {
    const term = keyword.trim();
    setPage(1);
    if (term === searchQuery) {
      triggerReload();
    } else {
      setSearchQuery(term);
    }
  };

  const revokePreview = (url: string | null) => {
    if (url && url.startsWith("blob:")) {
      URL.revokeObjectURL(url);
    }
  };

  const handleSelectLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (logoInputRef.current) {
      logoInputRef.current.value = "";
    }
    const objectUrl = URL.createObjectURL(file);
    setLogoCropSource((prev) => {
      if (prev?.revokeOnClose && prev.url) {
        URL.revokeObjectURL(prev.url);
      }
      return { url: objectUrl, fileName: file.name, revokeOnClose: true };
    });
    setLogoCropOpen(true);
  };

  const handleLogoCropped = (result: { file: File; previewUrl: string }) => {
    revokePreview(logoPreview);
    logoFileRef.current = result.file;
    setLogoPreview(result.previewUrl);
    setLogoCropSource({
      url: result.previewUrl,
      fileName: result.file.name,
      revokeOnClose: false,
    });
    setLogoCropOpen(false);
  };

  const clearLogoSelection = () => {
    logoFileRef.current = null;
    revokePreview(logoPreview);
    setLogoPreview(null);
    if (logoCropSource?.revokeOnClose && logoCropSource.url) {
      URL.revokeObjectURL(logoCropSource.url);
    }
    setLogoCropSource(null);
  };

  const handleLogoDialogOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setLogoCropOpen(false);
      setLogoCropSource((prev) => {
        if (prev?.revokeOnClose && prev.url) {
          URL.revokeObjectURL(prev.url);
          return null;
        }
        return prev;
      });
    } else if (logoCropSource) {
      setLogoCropOpen(true);
    }
  };

  const handleCreateBrand = async () => {
    if (!form.name.trim()) return;
    setCreateLoading(true);
    try {
      const payload = {
        name: form.name.trim(),
        slug: form.slug.trim() || undefined,
        summary: form.summary.trim() || undefined,
        logoUrl: logoFileRef.current
          ? undefined
          : form.logoUrl.trim() || undefined,
      };
      const res = await postJSON<{ data: Brand }>(
        "/api/admin/brands",
        payload,
      );
      const created = res.data;

      if (logoFileRef.current) {
        const fd = new FormData();
        fd.append("file", logoFileRef.current);
        const uploadRes = await fetch(
          `/api/admin/brands/${created.id}/upload-logo`,
          {
            method: "POST",
            headers: makeHeaders(),
            body: fd,
          },
        );
        if (!uploadRes.ok) {
          throw new Error("Upload logo thất bại");
        }
      }

      setForm({ name: "", slug: "", logoUrl: "", summary: "" });
      clearLogoSelection();
      toast.success("Đã tạo thương hiệu mới");
      triggerReload();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Không thể tạo thương hiệu";
      toast.error(message);
    } finally {
      setCreateLoading(false);
    }
  };

  const handleBulkFile = async (file: File) => {
    setPreviewLoading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);

      const res = await fetch("/api/admin/brands/bulk-import?mode=preview", {
        method: "POST",
        headers: makeHeaders(),
        body: fd,
      });

      const json = (await res.json()) as { rows?: BulkBrandPreviewRow[]; error?: string };
      if (!res.ok) {
        toast.error(json.error || "Không thể đọc file, vui lòng kiểm tra lại.");
        return;
      }

      const rawRows = Array.isArray(json.rows) ? json.rows : [];
      const rows: BrandDraft[] = rawRows.map((r, idx) => ({
        tempId: r.tempId ?? `row_${idx}_${Date.now()}`,
        name: r.name ?? "",
        slug: r.slug ?? "",
        summary: r.summary ?? "",
        logoUrl: r.logoUrl ?? "",
        mode: r.mode ?? "create",
        issues: r.issues ?? [],
      }));

      setDrafts(rows);
      setSelectedDraftIds([]);
      toast.success(`Đã phân tích ${rows.length} dòng từ file`);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Không thể xử lý file nhập";
      toast.error(message);
    } finally {
      setPreviewLoading(false);
    }
  };

  const loadLogoGallery = async (
    cursor?: string | null,
    append = false,
  ) => {
    setLogoGalleryLoading(true);
    setLogoGalleryError(null);
    try {
      const params = new URLSearchParams();
      if (cursor) {
        params.set("cursor", cursor);
      }
      const query = params.toString();
      const url = query
        ? `/api/admin/brands/gallery?${query}`
        : "/api/admin/brands/gallery";
      const res = await fetch(url, {
        headers: makeHeaders(),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Không thể tải thư viện logo");
      }
      const items = (json.items as BrandLogoAsset[]) ?? [];
      setLogoGalleryItems((prev) => (append ? [...prev, ...items] : items));
      setLogoGalleryCursor(json.nextCursor ?? null);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Không thể tải thư viện logo";
      setLogoGalleryError(message);
    } finally {
      setLogoGalleryLoading(false);
    }
  };

  const openLogoGallery = () => {
    setLogoGalleryItems([]);
    setLogoGalleryCursor(null);
    setLogoGalleryError(null);
    setLogoGalleryOpen(true);
    loadLogoGallery();
  };

  const handleEditLogoUpload = async (file: File) => {
    if (!editing) return;
    try {
      setLogoUpdating(true);
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/admin/brands/${editing.id}/upload-logo`, {
        method: "POST",
        headers: makeHeaders(),
        body: fd,
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Upload logo thất bại");
      }
      const nextUrl: string | undefined = json.data?.logoUrl;
      if (nextUrl) {
        setEditForm((prev) => ({ ...prev, logoUrl: nextUrl }));
        setEditing((prev) => (prev ? { ...prev, logoUrl: nextUrl } : prev));
      }
      toast.success("Đã cập nhật logo");
      triggerReload();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Không thể tải logo";
      toast.error(message);
    } finally {
      setLogoUpdating(false);
    }
  };

  const handleSelectGalleryLogo = async (asset: BrandLogoAsset) => {
    if (!editing) return;
    try {
      setLogoUpdating(true);
      await patchJSON(`/api/admin/brands/${editing.id}`, {
        logoUrl: asset.secureUrl,
      });
      setEditForm((prev) => ({ ...prev, logoUrl: asset.secureUrl }));
      setEditing((prev) => (prev ? { ...prev, logoUrl: asset.secureUrl } : prev));
      toast.success("Đã chọn logo từ thư viện");
      setLogoGalleryOpen(false);
      triggerReload();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Không thể áp dụng logo từ thư viện";
      toast.error(message);
    } finally {
      setLogoUpdating(false);
    }
  };

  const confirmDeleteBrand = async () => {
    if (!deleteTarget) return;
    try {
      setDeleteLoading(true);
      await del(`/api/admin/brands/${deleteTarget.id}`);
      toast.success(`Đã xóa thương hiệu ${deleteTarget.name}`);
      triggerReload();
      setDeleteTarget(null);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Không thể xóa thương hiệu";
      toast.error(message);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleUpdateBrand = async () => {
    if (!editing) return;
    try {
      setEditSaving(true);
      await patchJSON(`/api/admin/brands/${editing.id}`, {
        name: editForm.name,
        slug: editForm.slug || undefined,
        logoUrl: editForm.logoUrl || undefined,
        summary: editForm.summary || undefined,
      });
      toast.success("Đã cập nhật thương hiệu");
      setEditing(null);
      triggerReload();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Không thể cập nhật thương hiệu";
      toast.error(message);
    } finally {
      setEditSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Tìm kiếm + toggle */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-2">
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Tìm thương hiệu..."
            className="input input-bordered w-full max-w-xs border rounded px-3 py-2"
          />
          <button
            onClick={handleSearch}
            className="px-3 py-2 rounded bg-blue-600 text-white"
          >
            Tìm
          </button>
        </div>
        <button
          onClick={() => setShowCreateForm((prev) => !prev)}
          className="inline-flex items-center rounded bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-700"
        >
          {showCreateForm ? "Ẩn form tạo" : "Thêm thương hiệu"}
        </button>
      </div>

      {/* Bulk import: upload file + preview */}
      <div className="rounded-2xl border bg-white p-4 space-y-3">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="text-xs font-semibold uppercase text-blue-600">
              NHẬP THƯƠNG HIỆU TỪ FILE
            </div>
            <div className="text-sm text-gray-600">
              Dùng file CSV với các cột:{" "}
              <code className="bg-gray-100 px-1 py-0.5 rounded text-xs">
                name, slug, summary, logoUrl
              </code>
              . Bạn có thể tải file mẫu, điền dữ liệu rồi upload.
            </div>
            <button
              type="button"
              onClick={() => {
                window.location.href = "/api/admin/brands/bulk-import/template";
              }}
              className="mt-2 inline-flex items-center rounded border px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
            >
              Tải file mẫu CSV
            </button>
          </div>

          {/* Dropzone cho kéo / chọn file */}
          <div className="flex flex-col items-end gap-2">
            <label className="text-xs font-medium text-gray-700">
              Kéo file CSV vào hoặc bấm để chọn
            </label>
            <div
              className={
                "w-full max-w-xs border-2 border-dashed rounded-lg px-4 py-6 text-center text-xs cursor-pointer transition " +
                (isDragOver
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-300 hover:border-blue-400 hover:bg-gray-50")
              }
              onClick={() => bulkFileInputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                setIsDragOver(false);
              }}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragOver(false);
                const file = e.dataTransfer.files?.[0];
                if (file) {
                  handleBulkFile(file);
                }
              }}
            >
              <p className="font-medium text-gray-700 mb-1">
                Kéo file CSV vào đây
              </p>
              <p className="text-gray-500">hoặc bấm để chọn file từ máy</p>
              <input
                ref={bulkFileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleBulkFile(file);
                  e.target.value = "";
                }}
              />
            </div>
          </div>
        </div>

        {previewLoading && (
          <div className="text-sm text-gray-500 mt-2">
            Đang phân tích file...
          </div>
        )}
      </div>

      {/* Bảng brand hiện có */}
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
            {rows.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="px-3 py-2">
                  {r.logoUrl ? (
                    <div className="relative w-16 h-16 rounded border bg-white overflow-hidden">
                      <Image
                        src={r.logoUrl}
                        alt={r.name}
                        fill
                        className="object-contain"
                      />
                    </div>
                  ) : (
                    <button
                      onClick={() => openEdit(r)}
                      className="w-16 h-16 rounded border border-dashed border-blue-200 bg-blue-50/60 flex flex-col items-center justify-center text-[11px] text-blue-700 hover:bg-blue-50 transition"
                    >
                      <Upload className="w-4 h-4 mb-1" />
                      Thêm logo
                    </button>
                  )}
                </td>
                <td className="px-3 py-2 font-semibold">{r.name}</td>
                <td className="px-3 py-2 text-gray-500 font-mono">{r.slug}</td>
                <td className="px-3 py-2 max-w-md text-gray-700">
                  <span
                    className="line-clamp-2"
                    title={r.summary || undefined}
                  >
                    {r.summary || "—"}
                  </span>
                </td>
                <td className="px-3 py-2">{r.productCount}</td>
                <td className="px-3 py-2 text-gray-500">
                  {formatDate(r.createdAt)}
                </td>
                <td className="px-3 py-2 text-gray-500">
                  {formatDate(r.updatedAt)}
                </td>
                <td className="px-3 py-2 text-right space-x-3">
                  <button
                    onClick={() => openEdit(r)}
                    className="text-blue-600 hover:underline"
                  >
                    Sửa
                  </button>
                  <button
                    onClick={async () => {
                      setDeleteTarget(r);
                    }}
                    className="text-red-600"
                  >
                    Xóa
                  </button>
                </td>
              </tr>
            ))}
            {!rows.length && !loading && (
              <tr>
                <td
                  className="px-3 py-6 text-center text-gray-500"
                  colSpan={8}
                >
                  Không có dữ liệu
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
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

      {/* Bulk import preview table */}
      {drafts.length > 0 && (
        <div className="rounded-2xl border bg-white p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-semibold">
                Xem trước {drafts.length} thương hiệu sẽ nhập
              </div>
              <div className="text-xs text-gray-500">
                Bạn có thể chỉnh sửa trực tiếp từng dòng, chọn logo, loại bỏ
                các dòng không muốn nhập.
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Đã chọn {selectedDraftIds.length}/{drafts.length} thương hiệu.
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={!selectedDraftIds.length}
                onClick={async () => {
                  if (!selectedDraftIds.length) return;
                  const confirmed = await confirmToast(
                    "Loại bỏ các dòng đã chọn khỏi danh sách nhập?",
                  );
                  if (!confirmed) return;
                  setDrafts((prev) =>
                    prev.filter((d) => !selectedDraftIds.includes(d.tempId)),
                  );
                  setSelectedDraftIds([]);
                }}
                className="px-3 py-2 rounded-lg border text-xs font-medium text-red-600 disabled:opacity-40"
              >
                Loại bỏ dòng đã chọn
              </button>
              <button
                onClick={() => setImportOpen(true)}
                className="px-4 py-2 rounded-lg bg-green-600 text-sm font-semibold text-white"
              >
                Nhập vào hệ thống
              </button>
            </div>
          </div>

          <div className="overflow-x-auto border rounded">
            <table className="min-w-full text-xs">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left w-10">#</th>
                  <th className="px-3 py-2 text-left w-10">
                    <input
                      type="checkbox"
                      checked={
                        drafts.length > 0 &&
                        selectedDraftIds.length === drafts.length
                      }
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedDraftIds(drafts.map((d) => d.tempId));
                        } else {
                          setSelectedDraftIds([]);
                        }
                      }}
                    />
                  </th>
                  <th className="px-3 py-2 text-left">Trạng thái</th>
                  <th className="px-3 py-2 text-left">Tên</th>
                  <th className="px-3 py-2 text-left">Slug</th>
                  <th className="px-3 py-2 text-left">Summary</th>
                  <th className="px-3 py-2 text-left">Logo URL</th>
                  <th className="px-3 py-2 text-left">Logo upload</th>
                  <th className="px-3 py-2 text-left">Lỗi</th>
                  <th className="px-3 py-2 text-left">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {drafts.map((d, idx) => {
                  const checked = selectedDraftIds.includes(d.tempId);
                  return (
                    <tr key={d.tempId} className="border-t align-top">
                      {/* STT */}
                      <td className="px-3 py-2 text-gray-500">{idx + 1}</td>

                      {/* Checkbox chọn */}
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            const isChecked = e.target.checked;
                            setSelectedDraftIds((prev) =>
                              isChecked
                                ? [...prev, d.tempId]
                                : prev.filter((id) => id !== d.tempId),
                            );
                          }}
                        />
                      </td>

                      {/* Trạng thái */}
                      <td className="px-3 py-2">
                        <span
                          className={
                            "inline-flex rounded-full px-2 py-1 " +
                            (d.mode === "create"
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-amber-50 text-amber-700")
                          }
                        >
                          {d.mode === "create" ? "Tạo mới" : "Cập nhật"}
                        </span>
                      </td>

                      {/* Tên */}
                      <td className="px-3 py-2">
                        <input
                          value={d.name}
                          onChange={(e) => {
                            const v = e.target.value;
                            setDrafts((prev) => {
                              const arr = [...prev];
                              arr[idx] = { ...arr[idx], name: v };
                              return arr;
                            });
                          }}
                          className="w-full border rounded px-2 py-1"
                        />
                      </td>

                      {/* Slug */}
                      <td className="px-3 py-2">
                        <input
                          value={d.slug}
                          onChange={(e) => {
                            const v = e.target.value;
                            setDrafts((prev) => {
                              const arr = [...prev];
                              arr[idx] = { ...arr[idx], slug: v };
                              return arr;
                            });
                          }}
                          className="w-full border rounded px-2 py-1 font-mono"
                        />
                      </td>

                      {/* Summary */}
                      <td className="px-3 py-2">
                        <textarea
                          value={d.summary}
                          onChange={(e) => {
                            const v = e.target.value;
                            setDrafts((prev) => {
                              const arr = [...prev];
                              arr[idx] = { ...arr[idx], summary: v };
                              return arr;
                            });
                          }}
                          className="w-full border rounded px-2 py-1 min-h-[60px]"
                        />
                      </td>

                      {/* Logo URL */}
                      <td className="px-3 py-2">
                        <input
                          value={d.logoUrl}
                          onChange={(e) => {
                            const v = e.target.value;
                            setDrafts((prev) => {
                              const arr = [...prev];
                              arr[idx] = { ...arr[idx], logoUrl: v };
                              return arr;
                            });
                          }}
                          className="w-full border rounded px-2 py-1"
                        />
                      </td>

                      {/* Logo upload */}
                      <td className="px-3 py-2">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            setDrafts((prev) => {
                              const arr = [...prev];
                              arr[idx] = { ...arr[idx], logoFile: file };
                              return arr;
                            });
                          }}
                          className="text-[11px]"
                        />
                        {d.logoFile && (
                          <div className="text-[10px] text-gray-500 mt-1">
                            Đã chọn: {d.logoFile.name}
                          </div>
                        )}
                      </td>

                      {/* Lỗi */}
                      <td className="px-3 py-2 text-[11px] text-red-600 max-w-40">
                        {d.issues?.length ? (
                          d.issues.join("; ")
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>

                      {/* Hành động: loại từng dòng */}
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          onClick={() => {
                            setDrafts((prev) =>
                              prev.filter((x) => x.tempId !== d.tempId),
                            );
                            setSelectedDraftIds((prev) =>
                              prev.filter((id) => id !== d.tempId),
                            );
                          }}
                          className="text-xs text-red-600 hover:underline"
                        >
                          Loại bỏ
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Form tạo brand mới */}
      {showCreateForm && (
      <div className="rounded-2xl border bg-white shadow-sm">
        <div className="border-b px-6 py-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
            Thiết lập nhanh
          </p>
          <div className="mt-1 flex flex-col gap-1">
            <h3 className="text-xl font-semibold">Tạo thương hiệu mới</h3>
            <p className="text-sm text-gray-500">
              Thêm tên, mô tả và logo để hiển thị trong trang sản phẩm.
            </p>
          </div>
        </div>

        <div className="grid gap-8 px-6 py-6 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-800">
                Tên thương hiệu <span className="text-red-500">*</span>
              </label>
              <input
                className="w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                placeholder="VD: AHSO"
                value={form.name}
                onChange={(e) =>
                  setForm({ ...form, name: e.target.value })
                }
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-800">
                  Slug (tùy chọn)
                </label>
                <input
                  className="w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  placeholder="auto tạo nếu bỏ trống"
                  value={form.slug}
                  onChange={(e) =>
                    setForm({ ...form, slug: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-800">
                  Logo URL (tuỳ chọn)
                </label>
                <input
                  className="w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  placeholder="Dán URL nếu đã host ở nơi khác"
                  value={form.logoUrl}
                  onChange={(e) =>
                    setForm({ ...form, logoUrl: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-800">
                Giới thiệu ngắn
              </label>
              <textarea
                className="w-full rounded-lg border px-3 py-2 text-sm min-h-[140px] focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                placeholder="Tóm tắt lĩnh vực, sản phẩm nổi bật..."
                value={form.summary}
                onChange={(e) =>
                  setForm({ ...form, summary: e.target.value })
                }
              />
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-800">
              Logo tải lên
            </label>
            <p className="text-xs text-gray-500">
              Kích thước vuông, nền trong suốt càng tốt. Ảnh sẽ được chuyển
              sang WebP trước khi lưu.
            </p>
            <div className="flex items-start gap-4">
              <div className="relative h-28 w-28 overflow-hidden rounded-xl border bg-gray-50">
                {logoPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={logoPreview}
                    alt="Logo preview"
                    className="h-full w-full object-contain"
                  />
                ) : form.logoUrl ? (
                  <Image
                    src={form.logoUrl}
                    alt="Logo preview"
                    fill
                    sizes="112px"
                    className="object-contain"
                  />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center text-xs text-gray-400">
                    <Upload className="h-6 w-6" />
                    <span>Chưa có logo</span>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => logoInputRef.current?.click()}
                  className="inline-flex items-center rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white shadow hover:bg-blue-700"
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Chọn ảnh
                </button>
                <button
                  type="button"
                  disabled={!logoPreview}
                  onClick={() => {
                    if (!logoPreview) return;
                    setLogoCropSource({
                      url: logoPreview,
                      fileName: "logo.webp",
                      revokeOnClose: false,
                    });
                    setLogoCropOpen(true);
                  }}
                  className="inline-flex items-center rounded-lg border px-3 py-2 text-sm font-medium text-gray-700 transition disabled:opacity-50"
                >
                  <Pencil className="mr-2 h-4 w-4" />
                  Chỉnh sửa
                </button>
                <button
                  type="button"
                  disabled={!logoPreview}
                  onClick={clearLogoSelection}
                  className="inline-flex items-center rounded-lg border px-3 py-2 text-sm font-medium text-gray-700 transition disabled:opacity-50"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Xoá ảnh
                </button>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleSelectLogo}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t bg-gray-50 px-6 py-4">
          <div className="text-sm text-gray-500">
            Ảnh tải lên sẽ được xử lý và lưu tại Cloudinary.
          </div>
          <button
            onClick={handleCreateBrand}
            disabled={!form.name.trim() || createLoading}
            className="inline-flex items-center rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-green-700 disabled:opacity-60"
          >
            {createLoading && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Lưu thương hiệu
          </button>
        </div>
      </div>
      )}
      {/* Modal edit brand */}
      {editing && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-lg space-y-4 p-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-lg">Chỉnh sửa thương hiệu</h2>
              <button
                onClick={() => setEditing(null)}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Đóng
              </button>
            </div>
            <div className="space-y-3">
              <input
                className="border rounded px-3 py-2 w-full"
                value={editForm.name}
                onChange={(e) =>
                  setEditForm({ ...editForm, name: e.target.value })
                }
                placeholder="Tên"
              />
              <input
                className="border rounded px-3 py-2 w-full"
                value={editForm.slug}
                onChange={(e) =>
                  setEditForm({ ...editForm, slug: e.target.value })
                }
                placeholder="Slug"
              />
              <input
                className="border rounded px-3 py-2 w-full"
                value={editForm.logoUrl}
                onChange={(e) =>
                  setEditForm({ ...editForm, logoUrl: e.target.value })
                }
                placeholder="Logo URL"
              />
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Logo thương hiệu
                </label>
                <div className="flex items-start gap-3">
                  <div className="relative h-20 w-20 overflow-hidden rounded-lg border bg-gray-50">
                    {editForm.logoUrl ? (
                      <Image
                        src={editForm.logoUrl}
                        alt={editForm.name || "Logo thương hiệu"}
                        fill
                        sizes="80px"
                        className="object-contain"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[11px] text-gray-400 text-center px-2">
                        Chưa có logo
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => editLogoFileInputRef.current?.click()}
                      disabled={logoUpdating}
                      className="inline-flex items-center rounded border px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                      {logoUpdating ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="mr-2 h-4 w-4" />
                      )}
                      Tải logo mới
                    </button>
                    <button
                      type="button"
                      onClick={openLogoGallery}
                      disabled={logoUpdating}
                      className="inline-flex items-center rounded border px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                      Chọn từ thư viện
                    </button>
                    {logoUpdating && (
                      <div className="text-xs text-gray-500 flex items-center gap-2">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        <span>Đang cập nhật logo...</span>
                      </div>
                    )}
                  </div>
                </div>
                <p className="text-xs text-gray-500">
                  Thư viện dùng chung từ Cloudinary folder
                  <code className="ml-1 rounded bg-gray-100 px-1 py-0.5 text-[11px]">
                    brands/logos
                  </code>
                  .
                </p>
                <input
                  ref={editLogoFileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      void handleEditLogoUpload(file);
                    }
                    if (e.target) {
                      e.target.value = "";
                    }
                  }}
                />
              </div>
              <textarea
                className="border rounded px-3 py-2 w-full min-h-[100px]"
                value={editForm.summary}
                onChange={(e) =>
                  setEditForm({ ...editForm, summary: e.target.value })
                }
                placeholder="Giới thiệu"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setEditing(null)}
                className="px-3 py-2 rounded border"
              >
                Hủy
              </button>
              <button
                onClick={handleUpdateBrand}
                disabled={editSaving || logoUpdating}
                className="px-3 py-2 rounded bg-blue-600 text-white disabled:opacity-60 inline-flex items-center justify-center gap-2"
              >
                {editSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                <span>Lưu</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal confirm delete brand */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md space-y-4 p-5">
            <div>
              <h2 className="text-lg font-semibold">Xóa thương hiệu</h2>
              <p className="text-sm text-gray-600 mt-1">
                Bạn có chắc chắn muốn xóa{" "}
                <span className="font-semibold">{deleteTarget.name}</span>? Hành
                động này không thể hoàn tác.
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleteLoading}
                className="px-4 py-2 rounded border text-sm disabled:opacity-60"
              >
                Hủy
              </button>
              <button
                onClick={confirmDeleteBrand}
                disabled={deleteLoading}
                className="px-4 py-2 rounded bg-red-600 text-white text-sm font-semibold inline-flex items-center gap-2 disabled:opacity-60"
              >
                {deleteLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                <span>Xóa</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal gallery logos */}
      {logoGalleryOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-4xl space-y-4 p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Thư viện logo Cloudinary</h2>
              <button
                onClick={() => setLogoGalleryOpen(false)}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Đóng
              </button>
            </div>

            {logoGalleryError && (
              <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {logoGalleryError}
              </div>
            )}

            <div className="max-h-[60vh] overflow-y-auto rounded border p-3">
              {logoGalleryItems.length > 0 ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                  {logoGalleryItems.map((item) => (
                    <button
                      key={item.assetId}
                      type="button"
                      className="rounded border bg-white p-2 text-left transition hover:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                      disabled={logoUpdating}
                      onClick={() => void handleSelectGalleryLogo(item)}
                    >
                      <div className="relative w-full overflow-hidden rounded bg-gray-50 aspect-square">
                        <Image
                          src={item.secureUrl}
                          alt={item.publicId}
                          fill
                          className="object-contain"
                        />
                      </div>
                      <div className="mt-2 text-[11px] text-gray-500 line-clamp-2 break-all">
                        {item.publicId}
                      </div>
                      <div className="text-[10px] text-gray-400">
                        {(item.bytes / 1024).toFixed(0)} KB
                      </div>
                    </button>
                  ))}
                </div>
              ) : logoGalleryLoading ? (
                <div className="py-6 text-center text-sm text-gray-500">
                  Đang tải thư viện...
                </div>
              ) : (
                <div className="py-6 text-center text-sm text-gray-500">
                  Chưa có logo nào trong thư viện.
                </div>
              )}
            </div>

            <div className="flex items-center justify-between text-sm">
              <div className="text-xs text-gray-500">
                Folder Cloudinary: <code className="font-mono">brands/logos</code>
              </div>
              <div className="flex items-center gap-2">
                {logoGalleryCursor && (
                  <button
                    type="button"
                    onClick={() => loadLogoGallery(logoGalleryCursor, true)}
                    disabled={logoGalleryLoading}
                    className="rounded border px-3 py-2 text-sm disabled:opacity-50"
                  >
                    {logoGalleryLoading ? "Đang tải..." : "Tải thêm"}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setLogoGalleryOpen(false)}
                  className="rounded border px-3 py-2 text-sm"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal confirm import + progress */}
      {importOpen && drafts.length > 0 && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md space-y-4 p-4">
            <h2 className="text-lg font-semibold">
              Xác nhận nhập thương hiệu
            </h2>
            <p className="text-sm text-gray-600">
              Sẽ{" "}
              {drafts.filter((d) => d.mode === "create").length} thương hiệu tạo
              mới và{" "}
              {drafts.filter((d) => d.mode === "update").length} thương hiệu
              cập nhật.
            </p>

            {importProgress && (
              <div className="space-y-2">
                <div className="text-xs text-gray-500">
                  {importProgress.step === "commit" &&
                    "Đang ghi dữ liệu thương hiệu..."}
                  {importProgress.step === "upload_logos" &&
                    "Đang upload logo..."}
                </div>
                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 transition-all"
                    style={{
                      width:
                        importProgress.total > 0
                          ? `${
                              (importProgress.current /
                                importProgress.total) *
                              100
                            }%`
                          : "0%",
                    }}
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button
                disabled={!!importProgress}
                onClick={() => setImportOpen(false)}
                className="px-3 py-2 rounded border text-sm"
              >
                Hủy
              </button>
              <button
                disabled={!!importProgress}
                onClick={async () => {
                  try {
                    // STEP 1: commit brand
                    setImportProgress({
                      step: "commit",
                      current: 0,
                      total: 1,
                    });

                    const payload = {
                      rows: drafts.map((d) => ({
                        tempId: d.tempId,
                        name: d.name,
                        slug: d.slug,
                        summary: d.summary || null,
                        logoUrl: d.logoUrl || null,
                      })),
                    };

                    const res = await fetch(
                      "/api/admin/brands/bulk-import?mode=commit",
                      {
                        method: "POST",
                        headers: {
                          ...makeHeaders(),
                          "Content-Type": "application/json",
                        },
                        body: JSON.stringify(payload),
                      },
                    );

                    const json = await res.json();
                    if (!res.ok) {
                      toast.error(
                        json.message || json.error || "Import thất bại",
                      );
                      setImportProgress(null);
                      return;
                    }

                    const results: { tempId: string; brandId: string }[] =
                      json.results ?? [];

                    const idMap = new Map<string, string>();
                    results.forEach((r) => idMap.set(r.tempId, r.brandId));

                    // STEP 2: upload logos
                    const rowsWithLogo = drafts.filter((d) => d.logoFile);
                    if (rowsWithLogo.length > 0) {
                      setImportProgress({
                        step: "upload_logos",
                        current: 0,
                        total: rowsWithLogo.length,
                      });

                      let done = 0;
                      for (const row of rowsWithLogo) {
                        const brandId = idMap.get(row.tempId);
                        if (!brandId || !row.logoFile) continue;

                        const fd = new FormData();
                        fd.append("file", row.logoFile);

                        await fetch(
                          `/api/admin/brands/${brandId}/upload-logo`,
                          {
                            method: "POST",
                            headers: makeHeaders(),
                            body: fd,
                          },
                        ).catch(() => {});

                        done++;
                        setImportProgress((prev) =>
                          prev
                            ? {
                                ...prev,
                                current: done,
                              }
                            : {
                                step: "upload_logos",
                                current: done,
                                total: rowsWithLogo.length,
                              },
                        );
                      }
                    }

                    setImportProgress(null);
                    setImportOpen(false);
                    setDrafts([]);
                    setSelectedDraftIds([]);
                    triggerReload();
                    toast.success("Nhập thương hiệu hoàn tất");
                  } catch (e: unknown) {
                    const message =
                      e instanceof Error ? e.message : "Lỗi khi nhập dữ liệu";
                    console.error(e);
                    toast.error(message);
                    setImportProgress(null);
                  }
                }}
                className="px-4 py-2 rounded bg-green-600 text-sm font-semibold text-white"
              >
                Xác nhận nhập
              </button>
            </div>
          </div>
        </div>
      )}

      <ImageCropDialog
        open={logoCropOpen && Boolean(logoCropSource?.url)}
        imageSrc={logoCropSource?.url ?? null}
        fileName={logoCropSource?.fileName}
        aspectRatio={1}
        onOpenChange={handleLogoDialogOpenChange}
        onComplete={handleLogoCropped}
      />
    </div>
  );
}
