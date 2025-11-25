"use client";
import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Loader2, Upload, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ImageCropDialog } from "@/components/image/image-crop-dialog";
import { getJSON, del, patchJSON, makeHeaders } from "../_lib/fetcher";

type Cate = { id: string; name: string; slug: string };
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

type TypeDraft = {
  tempId: string;
  name: string;
  slug: string;
  categorySlug: string;
  description: string;
  coverImage: string;
  mode: "create" | "update";
  issues: string[];
  coverFile?: File;
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
  const [editForm, setEditForm] = useState({
    name: "",
    slug: "",
    coverImage: "",
    description: "",
    categoryId: "",
  });
  const [deleteTarget, setDeleteTarget] = useState<TypeRow | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [createCategoryId, setCreateCategoryId] = useState<string>("");
  const [createLoading, setCreateLoading] = useState(false);
  const [createStatus, setCreateStatus] = useState<{ type: "success" | "error"; message: string } | null>(
    null,
  );
  const [drafts, setDrafts] = useState<TypeDraft[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importProgress, setImportProgress] = useState<{
    step: "idle" | "commit" | "upload_covers";
    current: number;
    total: number;
  } | null>(null);
  const bulkFileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedDraftIds, setSelectedDraftIds] = useState<string[]>([]);
  const coverFileRef = useRef<File | null>(null);
  const coverInputRef = useRef<HTMLInputElement | null>(null);
  const editCoverFileInputRef = useRef<HTMLInputElement | null>(null);
  const [coverUpdating, setCoverUpdating] = useState(false);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [coverCropOpen, setCoverCropOpen] = useState(false);
  const [coverCropSource, setCoverCropSource] = useState<{
    url: string;
    fileName: string;
    revokeOnClose: boolean;
  } | null>(null);

  const triggerReload = () => setReloadToken((token) => token + 1);

  useEffect(() => {
    let ignore = false;
    const fetchCategories = async () => {
      const json = await getJSON<ListResp<Cate>>(`/api/admin/categories?page=1&pageSize=999`);
      if (ignore) return;
      const mapped = json.data.map((c) => ({ id: c.id, name: c.name, slug: c.slug }));
      setCategories(mapped);
      setCategoryId((prev) => prev || mapped[0]?.id || "");
      setCreateCategoryId((prev) => prev || mapped[0]?.id || "");
    };
    fetchCategories();
    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    if (!createCategoryId && categories.length) {
      setCreateCategoryId(categories[0].id);
    }
  }, [categories, createCategoryId]);

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
      categoryId: row.categoryId,
    });
  };

  const revokePreview = (url: string | null) => {
    if (url && url.startsWith("blob:")) {
      URL.revokeObjectURL(url);
    }
  };

  const handleSelectCover = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (coverInputRef.current) {
      coverInputRef.current.value = "";
    }
    const objectUrl = URL.createObjectURL(file);
    setCoverCropSource((prev) => {
      if (prev?.revokeOnClose && prev.url) {
        URL.revokeObjectURL(prev.url);
      }
      return { url: objectUrl, fileName: file.name, revokeOnClose: true };
    });
    setCoverCropOpen(true);
  };

  const handleCoverCropped = (result: { file: File; previewUrl: string }) => {
    revokePreview(coverPreview);
    coverFileRef.current = result.file;
    setCoverPreview(result.previewUrl);
    setCoverCropSource({ url: result.previewUrl, fileName: result.file.name, revokeOnClose: false });
    setCoverCropOpen(false);
  };

  const clearCoverSelection = () => {
    coverFileRef.current = null;
    revokePreview(coverPreview);
    setCoverPreview(null);
    if (coverCropSource?.revokeOnClose && coverCropSource.url) {
      URL.revokeObjectURL(coverCropSource.url);
    }
    setCoverCropSource(null);
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

  const selectedCreateCategoryId = createCategoryId || categories[0]?.id || "";

  const handleCreateType = async () => {
    if (!form.name.trim() || !selectedCreateCategoryId) return;
    setCreateLoading(true);
    setCreateStatus(null);
    try {
      const payload = {
        name: form.name.trim(),
        slug: form.slug.trim() || undefined,
        categoryId: selectedCreateCategoryId,
        description: form.description.trim() || undefined,
        coverImage: coverFileRef.current ? undefined : form.coverImage.trim() || undefined,
      };
      const res = await fetch("/api/admin/product-types", {
        method: "POST",
        headers: {
          ...makeHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        const friendly =
          typeof json.error === "string"
            ? translateTypeError(json.error)
            : "Không thể tạo loại sản phẩm";
        throw new Error(friendly);
      }

      const data = (await res.json()) as { data: TypeRow };
      const created = data.data;

      if (coverFileRef.current) {
        const fd = new FormData();
        fd.append("file", coverFileRef.current);
        fd.append("typeId", created.id);
        const uploadRes = await fetch(`/api/product-types/upload-cover`, {
          method: "POST",
          headers: makeHeaders(),
          body: fd,
        });
        if (!uploadRes.ok) {
          throw new Error("Upload ảnh loại sản phẩm thất bại");
        }
      }

      setForm({ name: "", slug: "", coverImage: "", description: "" });
      clearCoverSelection();
      setCreateStatus({ type: "success", message: "Tạo loại sản phẩm thành công" });
      toast.success("Đã tạo loại sản phẩm mới");
      triggerReload();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Không thể tạo loại sản phẩm";
      setCreateStatus({ type: "error", message });
      toast.error(message);
    } finally {
      setCreateLoading(false);
    }
  };

  const handleUpdateType = async () => {
    if (!editing) return;
    try {
      setEditSaving(true);
      await patchJSON(`/api/admin/product-types/${editing.id}`, {
        name: editForm.name,
        slug: editForm.slug || undefined,
        coverImage: editForm.coverImage || undefined,
        description: editForm.description || undefined,
        categoryId: editForm.categoryId || undefined,
      });
      toast.success("Đã cập nhật loại sản phẩm");
      setEditing(null);
      triggerReload();
    } catch (error) {
      const message = error instanceof Error ? extractErrorMessage(error) : "Không thể cập nhật loại sản phẩm";
      toast.error(message);
    } finally {
      setEditSaving(false);
    }
  };

  const handleEditCoverUpload = async (file: File) => {
    if (!editing) return;
    try {
      setCoverUpdating(true);
      const fd = new FormData();
      fd.append("typeId", editing.id);
      fd.append("file", file);
      const res = await fetch("/api/product-types/upload-cover", {
        method: "POST",
        headers: makeHeaders(),
        body: fd,
      });
      const json = await res.json();
      if (!res.ok || json.error) {
        throw new Error(json.error || "Upload ảnh thất bại");
      }
      const nextUrl: string | undefined = json.data?.coverImage;
      if (nextUrl) {
        setEditForm((prev) => ({ ...prev, coverImage: nextUrl }));
        setEditing((prev) => (prev ? { ...prev, coverImage: nextUrl } : prev));
      }
      toast.success("Đã cập nhật ảnh bìa");
      triggerReload();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Không thể tải ảnh bìa";
      toast.error(message);
    } finally {
      setCoverUpdating(false);
    }
  };

  const handleBulkFile = async (file: File) => {
    setPreviewLoading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/product-types/bulk-import?mode=preview", {
        method: "POST",
        headers: makeHeaders(),
        body: fd,
      });
      const json = (await res.json()) as { rows?: Partial<TypeDraft>[]; error?: string };
      if (!res.ok) {
        toast.error(json.error || "Không thể đọc file loại sản phẩm");
        return;
      }
      const rawRows = Array.isArray(json.rows) ? json.rows : [];
      const rows: TypeDraft[] = rawRows.map((r, idx) => ({
        tempId: r.tempId ?? `type_row_${idx}_${Date.now()}`,
        name: r.name ?? "",
        slug: r.slug ?? "",
        categorySlug: r.categorySlug ?? "",
        description: r.description ?? "",
        coverImage: r.coverImage ?? "",
        mode: (r.mode as "create" | "update") ?? "create",
        issues: r.issues ?? [],
      }));
      setDrafts(rows);
      setSelectedDraftIds([]);
      toast.success(`Đã phân tích ${rows.length} dòng từ file`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Không thể xử lý file nhập";
      toast.error(message);
    } finally {
      setPreviewLoading(false);
    }
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

      <div className="rounded-2xl border bg-white p-4 space-y-3">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="text-xs font-semibold uppercase text-purple-600">NHẬP LOẠI SẢN PHẨM TỪ FILE</div>
            <div className="text-sm text-gray-600">
              CSV cần các cột{" "}
              <code className="bg-gray-100 px-1 py-0.5 rounded text-xs">
                name, slug, categorySlug, description, coverImage
              </code>
              . Hãy tải file mẫu, điền dữ liệu rồi import.
            </div>
            <button
              type="button"
              onClick={() => {
                window.location.href = "/api/admin/product-types/bulk-import/template";
              }}
              className="mt-2 inline-flex items-center rounded border px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
            >
              Tải file mẫu CSV
            </button>
          </div>
          <div className="flex flex-col items-end gap-2">
            <label className="text-xs font-medium text-gray-700">Kéo CSV vào hoặc bấm để chọn</label>
            <div
              className={
                "w-full max-w-xs border-2 border-dashed rounded-lg px-4 py-6 text-center text-xs cursor-pointer transition " +
                (isDragOver ? "border-purple-500 bg-purple-50" : "border-gray-300 hover:border-purple-400 hover:bg-gray-50")
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
                if (file) handleBulkFile(file);
              }}
            >
              <p className="font-medium text-gray-700 mb-1">Kéo CSV vào đây</p>
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
        {previewLoading && <div className="text-sm text-gray-500">Đang phân tích file...</div>}
      </div>

      {importOpen && drafts.length > 0 && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md space-y-4 p-4">
            <h2 className="text-lg font-semibold">Xác nhận nhập loại sản phẩm</h2>
            <p className="text-sm text-gray-600">
              Sẽ{" "}
              {drafts.filter((d) => d.mode === "create").length} loại sản phẩm tạo mới và{" "}
              {drafts.filter((d) => d.mode === "update").length} loại sản phẩm cập nhật.
            </p>

            {importProgress && (
              <div className="space-y-2">
                <div className="text-xs text-gray-500">
                  {importProgress.step === "commit" && "Đang ghi dữ liệu loại sản phẩm..."}
                  {importProgress.step === "upload_covers" && "Đang upload ảnh cover..."}
                </div>
                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-purple-500 transition-all"
                    style={{
                      width:
                        importProgress.total > 0
                          ? `${(importProgress.current / importProgress.total) * 100}%`
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
                    setImportProgress({ step: "commit", current: 0, total: 1 });
                    const payload = {
                      rows: drafts.map((d) => ({
                        tempId: d.tempId,
                        name: d.name,
                        slug: d.slug,
                        categorySlug: d.categorySlug,
                        description: d.description || null,
                        coverImage: d.coverImage || null,
                      })),
                    };
                    const res = await fetch("/api/admin/product-types/bulk-import?mode=commit", {
                      method: "POST",
                      headers: {
                        ...makeHeaders(),
                        "Content-Type": "application/json",
                      },
                      body: JSON.stringify(payload),
                    });
                    const json = await res.json();
                    if (!res.ok) {
                      toast.error(json.message || json.error || "Import thất bại");
                      setImportProgress(null);
                      return;
                    }
                    const results: { tempId: string; typeId: string }[] = json.results ?? [];
                    const idMap = new Map<string, string>();
                    results.forEach((item) => idMap.set(item.tempId, item.typeId));

                    const rowsWithCover = drafts.filter((d) => d.coverFile);
                    if (rowsWithCover.length > 0) {
                      setImportProgress({
                        step: "upload_covers",
                        current: 0,
                        total: rowsWithCover.length,
                      });
                      let done = 0;
                      for (const row of rowsWithCover) {
                        const typeId = idMap.get(row.tempId);
                        if (!typeId || !row.coverFile) continue;
                        const fd = new FormData();
                        fd.append("typeId", typeId);
                        fd.append("file", row.coverFile);
                        await fetch("/api/product-types/upload-cover", {
                          method: "POST",
                          headers: makeHeaders(),
                          body: fd,
                        }).catch(() => {});
                        done++;
                        setImportProgress((prev) =>
                          prev
                            ? { ...prev, current: done }
                            : { step: "upload_covers", current: done, total: rowsWithCover.length },
                        );
                      }
                    }

                    setImportProgress(null);
                    setImportOpen(false);
                    setDrafts([]);
                    setSelectedDraftIds([]);
                    triggerReload();
                    toast.success("Nhập loại sản phẩm hoàn tất");
                  } catch (error) {
                    console.error(error);
                    const message =
                      error instanceof Error ? error.message : "Đã xảy ra lỗi trong quá trình nhập";
                    toast.error(message);
                    setImportProgress(null);
                  }
                }}
                className="px-4 py-2 rounded bg-purple-600 text-sm font-semibold text-white"
              >
                Xác nhận nhập
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md space-y-4 p-5">
            <div>
              <h2 className="text-lg font-semibold">Xóa loại sản phẩm</h2>
              <p className="text-sm text-gray-600 mt-1">
                Bạn có chắc chắn muốn xóa{" "}
                <span className="font-semibold">{deleteTarget.name}</span>? Hành động này không thể hoàn tác.
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
                onClick={async () => {
                  if (!deleteTarget) return;
                  try {
                    setDeleteLoading(true);
                    await del(`/api/admin/product-types/${deleteTarget.id}`);
                    toast.success("Đã xóa loại sản phẩm");
                    triggerReload();
                    setDeleteTarget(null);
                  } catch (error) {
                    const message =
                      error instanceof Error ? extractErrorMessage(error) : "Không thể xóa loại sản phẩm";
                    toast.error(message);
                  } finally {
                    setDeleteLoading(false);
                  }
                }}
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
                <td className="px-3 py-2 text-gray-500">{formatDate(r.updatedAt)}</td>
                <td className="px-3 py-2 text-right space-x-3">
                  <button onClick={()=>openEdit(r)} className="text-blue-600 hover:underline">Sửa</button>
                  <button
                    onClick={() => setDeleteTarget(r)}
                    className="text-red-600 hover:underline"
                  >
                    Xóa
                  </button>
                </td>
              </tr>
            ))}
            {!rows.length && <tr><td className="px-3 py-6 text-center text-gray-500" colSpan={4}>Không có dữ liệu</td></tr>}
          </tbody>
        </table>
      </div>

      {drafts.length > 0 && (
        <div className="rounded-2xl border bg-white p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-semibold">Xem trước {drafts.length} loại sản phẩm sẽ nhập</div>
              <div className="text-xs text-gray-500">
                Chỉnh sửa tên, slug, danh mục hoặc đường dẫn ảnh trước khi xác nhận.
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Đã chọn {selectedDraftIds.length}/{drafts.length} loại sản phẩm.
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={!selectedDraftIds.length}
                onClick={() => {
                  if (!selectedDraftIds.length) return;
                  if (!confirm("Loại bỏ các dòng đã chọn khỏi danh sách nhập?")) return;
                  setDrafts((prev) => prev.filter((d) => !selectedDraftIds.includes(d.tempId)));
                  setSelectedDraftIds([]);
                }}
                className="px-3 py-2 rounded-lg border text-xs font-medium text-red-600 disabled:opacity-40"
              >
                Loại bỏ dòng đã chọn
              </button>
              <button
                onClick={() => setImportOpen(true)}
                className="px-4 py-2 rounded-lg bg-purple-600 text-sm font-semibold text-white"
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
                      checked={drafts.length > 0 && selectedDraftIds.length === drafts.length}
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
                  <th className="px-3 py-2 text-left">Danh mục</th>
                  <th className="px-3 py-2 text-left">Mô tả</th>
                  <th className="px-3 py-2 text-left">Cover URL</th>
                  <th className="px-3 py-2 text-left">Cover upload</th>
                  <th className="px-3 py-2 text-left">Lỗi</th>
                  <th className="px-3 py-2 text-left">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {drafts.map((d, idx) => {
                  const checked = selectedDraftIds.includes(d.tempId);
                  const hasCategoryOption = categories.some((c) => c.slug === d.categorySlug);
                  return (
                    <tr key={d.tempId} className="border-t align-top">
                      <td className="px-3 py-2 text-gray-500">{idx + 1}</td>
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            const isChecked = e.target.checked;
                            setSelectedDraftIds((prev) =>
                              isChecked ? [...prev, d.tempId] : prev.filter((id) => id !== d.tempId),
                            );
                          }}
                        />
                      </td>
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
                      <td className="px-3 py-2">
                        <select
                          value={d.categorySlug}
                          onChange={(e) => {
                            const v = e.target.value;
                            setDrafts((prev) => {
                              const arr = [...prev];
                              arr[idx] = { ...arr[idx], categorySlug: v };
                              return arr;
                            });
                          }}
                          className="w-full border rounded px-2 py-1 text-sm"
                        >
                          <option value="">-- Chọn danh mục --</option>
                          {!hasCategoryOption && d.categorySlug && (
                            <option value={d.categorySlug}>
                              Khác ({d.categorySlug})
                            </option>
                          )}
                          {categories.map((cate) => (
                            <option key={cate.id} value={cate.slug}>
                              {cate.name} ({cate.slug})
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <textarea
                          value={d.description}
                          onChange={(e) => {
                            const v = e.target.value;
                            setDrafts((prev) => {
                              const arr = [...prev];
                              arr[idx] = { ...arr[idx], description: v };
                              return arr;
                            });
                          }}
                          className="w-full border rounded px-2 py-1 min-h-[60px]"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          value={d.coverImage}
                          onChange={(e) => {
                            const v = e.target.value;
                            setDrafts((prev) => {
                              const arr = [...prev];
                              arr[idx] = { ...arr[idx], coverImage: v };
                              return arr;
                            });
                          }}
                          className="w-full border rounded px-2 py-1"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            setDrafts((prev) => {
                              const arr = [...prev];
                              arr[idx] = { ...arr[idx], coverFile: file };
                              return arr;
                            });
                          }}
                          className="text-[11px]"
                        />
                        {d.coverFile && (
                          <div className="text-[10px] text-gray-500 mt-1">Đã chọn: {d.coverFile.name}</div>
                        )}
                      </td>
                      <td className="px-3 py-2 text-[11px] text-red-600 max-w-40">
                        {d.issues?.length ? d.issues.join("; ") : <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          onClick={() => {
                            setDrafts((prev) => prev.filter((x) => x.tempId !== d.tempId));
                            setSelectedDraftIds((prev) => prev.filter((id) => id !== d.tempId));
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

      <div className="rounded-2xl border bg-white shadow-sm">
        <div className="border-b px-6 py-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-purple-600">
            Nhóm sản phẩm
          </p>
          <div className="mt-1 flex flex-col gap-1">
            <h3 className="text-xl font-semibold">Tạo loại sản phẩm mới</h3>
            <p className="text-sm text-gray-500">
              Gắn loại vào danh mục cụ thể để khách hàng dễ lọc sản phẩm.
            </p>
          </div>
        </div>

        <div className="grid gap-8 px-6 py-6 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-800">
                Thuộc danh mục <span className="text-red-500">*</span>
              </label>
              <select
                className="w-full rounded-lg border px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-100"
                value={selectedCreateCategoryId}
                onChange={(e) => setCreateCategoryId(e.target.value)}
              >
                {categories.map((cate) => (
                  <option key={cate.id} value={cate.id}>
                    {cate.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-800">
                  Tên loại sản phẩm <span className="text-red-500">*</span>
                </label>
                <input
                  className="w-full rounded-lg border px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-100"
                  placeholder="Ví dụ: Máy CNC"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-800">Slug (tùy chọn)</label>
                <input
                  className="w-full rounded-lg border px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-100"
                  placeholder="tự tạo nếu bỏ trống"
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-800">Mô tả</label>
              <textarea
                className="w-full rounded-lg border px-3 py-2 text-sm min-h-[140px] focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-100"
                placeholder="Giới thiệu về loại sản phẩm..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-800">Ảnh minh họa</label>
            <p className="text-xs text-gray-500">
              Ảnh tỉ lệ 16:9 sẽ hiển thị ở các trang danh mục và landing sản phẩm.
            </p>
            <div className="flex gap-4">
              <div className="relative h-28 w-48 overflow-hidden rounded-xl border bg-gray-50">
                {coverPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={coverPreview} alt="Type cover" className="h-full w-full object-cover" />
                ) : form.coverImage ? (
                  <Image
                    src={form.coverImage}
                    alt="Type cover"
                    fill
                    sizes="192px"
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center text-xs text-gray-400">
                    <Upload className="h-6 w-6" />
                    <span>Chưa có ảnh</span>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => coverInputRef.current?.click()}
                  className="inline-flex items-center rounded-lg bg-purple-600 px-3 py-2 text-sm font-medium text-white shadow hover:bg-purple-700"
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Chọn ảnh
                </button>
                <button
                  type="button"
                  disabled={!coverPreview}
                  onClick={() => {
                    if (!coverPreview) return;
                    setCoverCropSource({
                      url: coverPreview,
                      fileName: "product-type.webp",
                      revokeOnClose: false,
                    });
                    setCoverCropOpen(true);
                  }}
                  className="inline-flex items-center rounded-lg border px-3 py-2 text-sm font-medium text-gray-700 transition disabled:opacity-50"
                >
                  <Pencil className="mr-2 h-4 w-4" />
                  Chỉnh sửa
                </button>
                <button
                  type="button"
                  disabled={!coverPreview}
                  onClick={clearCoverSelection}
                  className="inline-flex items-center rounded-lg border px-3 py-2 text-sm font-medium text-gray-700 transition disabled:opacity-50"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Xoá ảnh
                </button>
                <input
                  ref={coverInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleSelectCover}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t bg-gray-50 px-6 py-4">
          {createStatus ? (
            <div
              className={`text-sm ${
                createStatus.type === "success" ? "text-green-600" : "text-red-600"
              }`}
            >
              {createStatus.message}
            </div>
          ) : (
            <div className="text-sm text-gray-500">Ảnh sẽ được crop → WebP và upload lên Cloudinary.</div>
          )}
          <button
            onClick={handleCreateType}
            disabled={!form.name.trim() || !selectedCreateCategoryId || createLoading}
            className="inline-flex items-center rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-green-700 disabled:opacity-60"
          >
            {createLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Lưu loại sản phẩm
          </button>
        </div>
      </div>
      {editing && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-2xl space-y-4 p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-lg">Chỉnh sửa loại sản phẩm</h2>
              <button onClick={() => setEditing(null)} className="text-sm text-gray-500 hover:text-gray-700">
                Đóng
              </button>
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Danh mục</label>
                  <select
                    className="border rounded px-3 py-2 w-full"
                    value={editForm.categoryId}
                    onChange={(e) => setEditForm({ ...editForm, categoryId: e.target.value })}
                  >
                    <option value="">-- Chọn danh mục --</option>
                    {categories.map((cate) => (
                      <option key={cate.id} value={cate.id}>
                        {cate.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Tên loại</label>
                  <input
                    className="border rounded px-3 py-2 w-full"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    placeholder="Tên loại"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Slug</label>
                  <input
                    className="border rounded px-3 py-2 w-full"
                    value={editForm.slug}
                    onChange={(e) => setEditForm({ ...editForm, slug: e.target.value })}
                    placeholder="slug"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Ảnh cover (URL)</label>
                  <input
                    className="border rounded px-3 py-2 w-full"
                    value={editForm.coverImage}
                    onChange={(e) => setEditForm({ ...editForm, coverImage: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Mô tả</label>
                  <textarea
                    className="border rounded px-3 py-2 w-full min-h-[120px]"
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    placeholder="Mô tả ngắn"
                  />
                </div>
              </div>
              <div className="space-y-3">
                <label className="text-sm font-medium text-gray-700">Ảnh hiện tại</label>
                <div className="rounded-xl border bg-gray-50 overflow-hidden aspect-video relative">
                  {editForm.coverImage ? (
                    <Image
                      src={editForm.coverImage}
                      alt={editForm.name || "Ảnh loại sản phẩm"}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-gray-400">
                      Chưa có ảnh
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  disabled={coverUpdating}
                  onClick={() => editCoverFileInputRef.current?.click()}
                  className="inline-flex w-full items-center justify-center rounded border px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  {coverUpdating ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="mr-2 h-4 w-4" />
                  )}
                  {coverUpdating ? "Đang cập nhật ảnh..." : "Tải ảnh mới"}
                </button>
                <input
                  ref={editCoverFileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleEditCoverUpload(file);
                    if (e.target) e.target.value = "";
                  }}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button className="px-3 py-2 rounded border" onClick={() => setEditing(null)}>
                Hủy
              </button>
              <button
                onClick={handleUpdateType}
                disabled={editSaving || coverUpdating}
                className="px-3 py-2 rounded bg-blue-600 text-white inline-flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {editSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                <span>Lưu</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <ImageCropDialog
        open={coverCropOpen && Boolean(coverCropSource?.url)}
        imageSrc={coverCropSource?.url ?? null}
        fileName={coverCropSource?.fileName}
        aspectRatio={16 / 9}
        onOpenChange={handleCoverDialogOpenChange}
        onComplete={handleCoverCropped}
      />
    </div>
  );
}

function extractErrorMessage(error: unknown) {
  if (error instanceof Error) {
    try {
      const parsed = JSON.parse(error.message);
      if (parsed && typeof parsed.error === "string") {
        return translateTypeError(parsed.error);
      }
    } catch {
      // ignore
    }
    return translateTypeError(error.message || "Đã có lỗi xảy ra");
  }
  return "Đã có lỗi xảy ra";
}

function translateTypeError(message: string) {
  const normalized = message?.toLowerCase();
  if (!normalized) return "Đã có lỗi xảy ra";
  if (normalized.includes("slug already exists")) {
    return "Tên/slug đã tồn tại trong danh mục này";
  }
  if (normalized.includes("categoryid not found")) {
    return "Không tìm thấy danh mục đã chọn";
  }
  if (normalized.includes("validation")) {
    return "Dữ liệu chưa hợp lệ, vui lòng kiểm tra lại";
  }
  return message;
}
