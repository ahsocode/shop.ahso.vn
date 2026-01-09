"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getJSON, postJSON, patchJSON, del, makeHeaders } from "../_lib/fetcher";
import AdminTinyMCEEditor from "@/components/admin/TinyMCEEditor";

type SoftwareStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

type SoftwareCategory = {
  id: string;
  name: string;
};

type SoftwareRow = {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  status: SoftwareStatus;
  coverImage: string | null;
  categoryId: string;
  publishedAt: string | null;
  updatedAt: string;
  softwarecategory: { id: string; name: string } | null;
};

type GalleryItem = {
  publicId: string;
  secureUrl: string;
  createdAt: string;
};

type ListResp<T> = {
  data: T[];
  meta: { total: number; page: number; pageSize: number };
};

const EMPTY_FORM = {
  id: "",
  title: "",
  summary: "",
  coverImage: "",
  bodyHtml: "",
  status: "DRAFT" as SoftwareStatus,
  categoryId: "",
};

export default function AdminSoftwarePage() {
  const [rows, setRows] = useState<SoftwareRow[]>([]);
  const [categories, setCategories] = useState<SoftwareCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | SoftwareStatus>("");
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [total, setTotal] = useState(0);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formOpen, setFormOpen] = useState(false);
  const [coverUploading, setCoverUploading] = useState(false);
  const coverInputRef = useRef<HTMLInputElement | null>(null);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);
  const [galleryLoading, setGalleryLoading] = useState(false);
  const [galleryUploading, setGalleryUploading] = useState(false);
  const [galleryCursor, setGalleryCursor] = useState<string | null>(null);
  const [gallerySelected, setGallerySelected] = useState("");
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const [statusLoading, setStatusLoading] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState<string | null>(null);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const params = useMemo(() => {
    const sp = new URLSearchParams();
    if (query) sp.set("q", query);
    if (statusFilter) sp.set("status", statusFilter);
    sp.set("page", String(page));
    sp.set("pageSize", String(pageSize));
    return sp.toString();
  }, [query, statusFilter, page]);

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      setLoading(true);
      try {
        const [listRes, catRes] = await Promise.all([
          getJSON<ListResp<SoftwareRow>>(`/api/admin/software?${params}`),
          getJSON<{ data: SoftwareCategory[] }>("/api/admin/software-categories"),
        ]);
        if (ignore) return;
        setRows(listRes.data);
        setTotal(listRes.meta.total);
        setCategories(catRes.data);
      } catch {
        if (!ignore) toast.error("Không thể tải danh sách phần mềm");
      } finally {
        if (!ignore) setLoading(false);
      }
    };
    load();
    return () => {
      ignore = true;
    };
  }, [params]);

  useEffect(() => {
    setPage(1);
  }, [query, statusFilter]);

  const startEdit = async (row: SoftwareRow) => {
    try {
      const detail = await getJSON<{ data: SoftwareRow & { bodyHtml: string; metaTitle: string | null; metaDescription: string | null; canonicalUrl: string | null } }>(
        `/api/admin/software/${row.id}`,
      );
      const data = detail.data;
      setForm({
        id: data.id,
        title: data.title,
        summary: data.summary ?? "",
        coverImage: data.coverImage ?? "",
        bodyHtml: data.bodyHtml ?? "",
        status: data.status,
        categoryId: data.categoryId,
      });
      setFormOpen(true);
    } catch {
      toast.error("Không thể tải dữ liệu phần mềm");
    }
  };

  const resetForm = () => setForm(EMPTY_FORM);

  const openCreateForm = () => {
    resetForm();
    setFormOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.title || !form.categoryId || !form.bodyHtml) {
      toast.error("Vui lòng nhập tiêu đề, danh mục và nội dung");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: form.title,
        summary: form.summary,
        coverImage: form.coverImage,
        bodyHtml: form.bodyHtml,
        status: form.status,
        categoryId: form.categoryId,
      };
      if (form.id) {
        await patchJSON(`/api/admin/software/${form.id}`, payload);
        toast.success("Đã cập nhật phần mềm");
      } else {
        await postJSON("/api/admin/software", payload);
        toast.success("Đã tạo phần mềm");
      }
      resetForm();
      setFormOpen(false);
      const listRes = await getJSON<ListResp<SoftwareRow>>(`/api/admin/software?${params}`);
      setRows(listRes.data);
      setTotal(listRes.meta.total);
    } catch {
      toast.error("Không thể lưu phần mềm");
    } finally {
      setSaving(false);
    }
  };

  const handleCoverUpload = async (file: File) => {
    setCoverUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/software/upload-cover", {
        method: "POST",
        headers: makeHeaders(),
        body: fd,
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error || "Không thể upload ảnh bìa");
      }
      setForm((prev) => ({ ...prev, coverImage: data.url || "" }));
      toast.success("Đã upload ảnh bìa");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể upload ảnh bìa");
    } finally {
      setCoverUploading(false);
      if (coverInputRef.current) coverInputRef.current.value = "";
    }
  };

  const handleDelete = async (row: SoftwareRow) => {
    if (!confirm(`Xóa phần mềm "${row.title}"?`)) return;
    try {
      await del(`/api/admin/software/${row.id}`);
      toast.success("Đã xóa phần mềm");
      const listRes = await getJSON<ListResp<SoftwareRow>>(`/api/admin/software?${params}`);
      setRows(listRes.data);
      setTotal(listRes.meta.total);
      if (form.id === row.id) resetForm();
    } catch {
      toast.error("Không thể xóa phần mềm");
    }
  };

  const handleQuickStatus = async (row: SoftwareRow, nextStatus: SoftwareStatus) => {
    if (row.status === nextStatus) return;
    setStatusLoading(row.id);
    try {
      await patchJSON(`/api/admin/software/${row.id}/status`, { status: nextStatus });
      setRows((prev) =>
        prev.map((r) => (r.id === row.id ? { ...r, status: nextStatus } : r)),
      );
      toast.success("Đã cập nhật trạng thái");
    } catch {
      toast.error("Không thể cập nhật trạng thái");
    } finally {
      setStatusLoading(null);
    }
  };

  const handlePreview = async (row: SoftwareRow) => {
    if (!row.slug) {
      toast.error("Bài viết chưa có slug để preview");
      return;
    }
    setPreviewLoading(row.id);
    try {
      const res = await fetch(
        `/api/admin/preview?type=software&slug=${encodeURIComponent(row.slug)}`,
        { headers: makeHeaders() },
      );
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error || "Không thể tạo preview");
      }
      const url = data?.url;
      if (url) {
        window.open(url, "_blank");
      } else {
        throw new Error("Không tìm thấy URL preview");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể tạo preview");
    } finally {
      setPreviewLoading(null);
    }
  };

  const loadGallery = async (reset = false) => {
    setGalleryLoading(true);
    try {
      const params = new URLSearchParams();
      if (!reset && galleryCursor) params.set("nextCursor", galleryCursor);
      params.set("maxResults", "40");
      const res = await getJSON<{ items: GalleryItem[]; nextCursor: string | null }>(
        `/api/admin/software/gallery?${params.toString()}`,
      );
      setGalleryItems((prev) => (reset ? res.items : [...prev, ...res.items]));
      setGalleryCursor(res.nextCursor ?? null);
    } catch {
      toast.error("Không thể tải thư viện ảnh");
    } finally {
      setGalleryLoading(false);
    }
  };

  const openGallery = () => {
    setGallerySelected("");
    setGalleryItems([]);
    setGalleryCursor(null);
    setGalleryOpen(true);
    void loadGallery(true);
  };

  const handleGalleryUpload = async (files: FileList | null) => {
    if (!files?.length) return;
    setGalleryUploading(true);
    try {
      const fd = new FormData();
      Array.from(files).forEach((file) => fd.append("files", file));
      const res = await fetch("/api/admin/software/gallery", {
        method: "POST",
        headers: makeHeaders(),
        body: fd,
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error || "Không thể upload ảnh");
      }
      toast.success("Đã upload ảnh vào gallery");
      setGalleryItems([]);
      setGalleryCursor(null);
      void loadGallery(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể upload ảnh");
    } finally {
      setGalleryUploading(false);
      if (galleryInputRef.current) galleryInputRef.current.value = "";
    }
  };

  const handleCopyGalleryLink = async () => {
    if (!gallerySelected) return;
    try {
      await navigator.clipboard.writeText(gallerySelected);
      toast.success("Đã copy link ảnh");
    } catch {
      toast.error("Không thể copy link ảnh");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-slate-900">Phần mềm & dịch vụ</h1>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={openCreateForm}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
          >
            Tạo bài viết
          </button>
          <Link
            href="/admin/software-categories"
            className="text-sm font-semibold text-blue-600 hover:text-blue-700"
          >
            Quản lý danh mục phần mềm
          </Link>
        </div>
      </div>

      <div className="rounded-xl border bg-white p-4 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm tiêu đề/summary..."
              className="flex-1 rounded border px-3 py-2 text-sm"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as SoftwareStatus | "")}
              className="rounded border px-3 py-2 text-sm"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="DRAFT">DRAFT</option>
              <option value="PUBLISHED">PUBLISHED</option>
              <option value="ARCHIVED">ARCHIVED</option>
            </select>
          </div>

          {loading ? (
            <div className="text-sm text-gray-500">Đang tải...</div>
          ) : rows.length === 0 ? (
            <div className="text-sm text-gray-500">Chưa có bài viết.</div>
          ) : (
            <div className="space-y-3">
              {rows.map((row) => (
                <div
                  key={row.id}
                  className="rounded-lg border border-gray-200 px-3 py-2"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-gray-100">
                        <img
                          src={row.coverImage || "/logo.png"}
                          alt={row.title}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900">{row.title}</div>
                        <div className="text-xs text-gray-500">
                          {row.softwarecategory?.name ?? "Chưa phân loại"} ·{" "}
                          <span className="font-semibold text-gray-700">{row.status}</span>
                        </div>
                        {row.summary && (
                          <p className="mt-2 text-xs text-gray-600 line-clamp-2">
                            {row.summary}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <select
                        value={row.status}
                        onChange={(e) =>
                          handleQuickStatus(row, e.target.value as SoftwareStatus)
                        }
                        disabled={statusLoading === row.id}
                        className="rounded border px-2 py-1 text-xs"
                      >
                        <option value="DRAFT">DRAFT</option>
                        <option value="PUBLISHED">PUBLISHED</option>
                        <option value="ARCHIVED">ARCHIVED</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => handlePreview(row)}
                        disabled={previewLoading === row.id}
                        className="text-emerald-600 hover:underline disabled:opacity-60"
                      >
                        Preview
                      </button>
                      <button
                        type="button"
                        onClick={() => startEdit(row)}
                        className="text-blue-600 hover:underline"
                      >
                        Sửa
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(row)}
                        className="text-red-600 hover:underline"
                      >
                        Xóa
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>
              Trang {page}/{totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded border px-2 py-1 disabled:opacity-50"
              >
                Trước
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="rounded border px-2 py-1 disabled:opacity-50"
              >
                Sau
              </button>
            </div>
          </div>
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle>
              {form.id ? "Chỉnh sửa phần mềm" : "Tạo bài viết phần mềm"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-semibold text-gray-600">
              Tiêu đề
              <input
                value={form.title}
                onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                className="mt-1 w-full rounded border px-3 py-2 text-sm"
              />
            </label>
            <label className="text-xs font-semibold text-gray-600 sm:col-span-2">
              Mô tả ngắn
              <textarea
                value={form.summary}
                onChange={(e) => setForm((prev) => ({ ...prev, summary: e.target.value }))}
                className="mt-1 w-full rounded border px-3 py-2 text-sm"
                rows={3}
              />
            </label>
            <label className="text-xs font-semibold text-gray-600">
              Danh mục
              <select
                value={form.categoryId}
                onChange={(e) => setForm((prev) => ({ ...prev, categoryId: e.target.value }))}
                className="mt-1 w-full rounded border px-3 py-2 text-sm"
              >
                <option value="">Chọn danh mục</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-semibold text-gray-600">
              Trạng thái
              <select
                value={form.status}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, status: e.target.value as SoftwareStatus }))
                }
                className="mt-1 w-full rounded border px-3 py-2 text-sm"
              >
                <option value="DRAFT">DRAFT</option>
                <option value="PUBLISHED">PUBLISHED</option>
                <option value="ARCHIVED">ARCHIVED</option>
              </select>
            </label>
            <div className="sm:col-span-2">
              <div className="text-xs font-semibold text-gray-600">Ảnh bìa</div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => coverInputRef.current?.click()}
                  className="rounded border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                  disabled={coverUploading}
                >
                  {coverUploading ? "Đang upload..." : "Tải ảnh bìa"}
                </button>
                {form.coverImage && (
                  <button
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, coverImage: "" }))}
                    className="text-xs text-red-600 hover:underline"
                  >
                    Xóa ảnh bìa
                  </button>
                )}
                <input
                  ref={coverInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleCoverUpload(file);
                  }}
                />
              </div>
              {form.coverImage && (
                <div className="mt-3 w-full max-w-xs overflow-hidden rounded-lg border border-gray-200">
                  <img
                    src={form.coverImage}
                    alt="Cover"
                    className="h-40 w-full object-cover"
                  />
                </div>
              )}
            </div>
            <div className="sm:col-span-2">
              <div className="text-xs font-semibold text-gray-600">Thư viện ảnh</div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className="rounded border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                  onClick={() => galleryInputRef.current?.click()}
                  disabled={galleryUploading}
                >
                  {galleryUploading ? "Đang upload..." : "Tải ảnh vào gallery"}
                </button>
                <button
                  type="button"
                  className="rounded border px-3 py-1.5 text-xs"
                  onClick={openGallery}
                >
                  Chọn ảnh từ gallery
                </button>
                <input
                  ref={galleryInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => handleGalleryUpload(e.target.files)}
                />
              </div>
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold text-gray-600 mb-2">Nội dung</div>
            <AdminTinyMCEEditor
              value={form.bodyHtml}
              onChange={(value) => setForm((prev) => ({ ...prev, bodyHtml: value }))}
            />
          </div>

          <DialogFooter className="gap-2">
            <button
              type="button"
              className="rounded border px-4 py-2 text-sm"
              onClick={() => setFormOpen(false)}
              disabled={saving}
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving}
              className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {saving ? "Đang lưu..." : "Lưu bài viết"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={galleryOpen} onOpenChange={setGalleryOpen}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>Gallery ảnh phần mềm</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="rounded border px-3 py-2 text-xs font-semibold"
                onClick={() => galleryInputRef.current?.click()}
                disabled={galleryUploading}
              >
                {galleryUploading ? "Đang upload..." : "Tải ảnh vào gallery"}
              </button>
            </div>

            {galleryLoading && galleryItems.length === 0 ? (
              <div className="text-sm text-gray-500">Đang tải...</div>
            ) : galleryItems.length === 0 ? (
              <div className="text-sm text-gray-500">Chưa có ảnh trong gallery.</div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {galleryItems.map((item) => (
                  <button
                    key={item.publicId}
                    type="button"
                    className={`overflow-hidden rounded border text-left ${
                      gallerySelected === item.secureUrl ? "border-blue-500" : "border-gray-200"
                    }`}
                    onClick={() => setGallerySelected(item.secureUrl)}
                  >
                    <img src={item.secureUrl} alt="" className="h-32 w-full object-cover" />
                    <div className="px-2 py-1 text-[11px] text-gray-500 line-clamp-1">
                      {item.publicId}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {galleryCursor && (
              <button
                type="button"
                className="rounded border px-3 py-2 text-xs"
                onClick={() => loadGallery(false)}
                disabled={galleryLoading}
              >
                {galleryLoading ? "Đang tải..." : "Tải thêm ảnh"}
              </button>
            )}

            <div className="rounded border bg-slate-50 p-3 text-xs">
              <div className="font-semibold text-slate-700">Link ảnh đã chọn</div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <input
                  value={gallerySelected}
                  readOnly
                  placeholder="Chọn ảnh để lấy link"
                  className="flex-1 rounded border px-2 py-1 text-xs"
                />
                <button
                  type="button"
                  className="rounded border px-3 py-1 text-xs"
                  onClick={handleCopyGalleryLink}
                  disabled={!gallerySelected}
                >
                  Copy link
                </button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <button
              type="button"
              className="rounded border px-4 py-2 text-sm"
              onClick={() => setGalleryOpen(false)}
            >
              Đóng
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
