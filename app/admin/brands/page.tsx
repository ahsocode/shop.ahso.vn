"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Loader2, Upload, Pencil, Trash2 } from "lucide-react";
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
type ListResp = { data: Brand[]; meta: { total: number; page: number; pageSize: number } };

const formatDate = (iso: string) =>
  new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(iso),
  );

export default function BrandsPage() {
  const pageSize = 20;
  const [keyword, setKeyword] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<Brand[]>([]);
  const [total, setTotal] = useState(0);
  const [form, setForm] = useState({ name: "", slug: "", logoUrl: "", summary: "" });
  const [loading, setLoading] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const [editing, setEditing] = useState<Brand | null>(null);
  const [editForm, setEditForm] = useState({ name: "", slug: "", logoUrl: "", summary: "" });
  const [createLoading, setCreateLoading] = useState(false);
  const [createStatus, setCreateStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const logoFileRef = useRef<File | null>(null);
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoCropOpen, setLogoCropOpen] = useState(false);
  const [logoCropSource, setLogoCropSource] = useState<{
    url: string;
    fileName: string;
    revokeOnClose: boolean;
  } | null>(null);

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
        const json = await getJSON<ListResp>(`/api/admin/brands?${params.toString()}`);
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
    setCreateStatus(null);
    try {
      const payload = {
        name: form.name.trim(),
        slug: form.slug.trim() || undefined,
        summary: form.summary.trim() || undefined,
        logoUrl: logoFileRef.current ? undefined : form.logoUrl.trim() || undefined,
      };
      const res = await postJSON<{ data: Brand }>("/api/admin/brands", payload);
      const created = res.data;

      if (logoFileRef.current) {
        const fd = new FormData();
        fd.append("file", logoFileRef.current);
        const uploadRes = await fetch(`/api/admin/brands/${created.id}/upload-logo`, {
          method: "POST",
          headers: makeHeaders(),
          body: fd,
        });
        if (!uploadRes.ok) {
          throw new Error("Upload logo thất bại");
        }
      }

      setForm({ name: "", slug: "", logoUrl: "", summary: "" });
      clearLogoSelection();
      setCreateStatus({ type: "success", message: "Tạo thương hiệu thành công" });
      triggerReload();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Không thể tạo thương hiệu";
      setCreateStatus({ type: "error", message });
    } finally {
      setCreateLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="Tìm thương hiệu..."
          className="input input-bordered w-full max-w-xs border rounded px-3 py-2"
        />
        <button onClick={handleSearch} className="px-3 py-2 rounded bg-blue-600 text-white">
          Tìm
        </button>
      </div>

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
            {rows.map(r=>(
              <tr key={r.id} className="border-t">
                <td className="px-3 py-2">
                  {r.logoUrl ? (
                    <div className="relative w-16 h-16 rounded border bg-white overflow-hidden">
                      <Image src={r.logoUrl} alt={r.name} fill className="object-contain" />
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded border bg-gray-50 flex items-center justify-center text-xs text-gray-500">
                      No logo
                    </div>
                  )}
                </td>
                <td className="px-3 py-2 font-semibold">{r.name}</td>
                <td className="px-3 py-2 text-gray-500 font-mono">{r.slug}</td>
                <td className="px-3 py-2 max-w-md text-gray-700">
                  <span className="line-clamp-2" title={r.summary || undefined}>
                    {r.summary || "—"}
                  </span>
                </td>
                <td className="px-3 py-2">{r.productCount}</td>
                <td className="px-3 py-2 text-gray-500">{formatDate(r.createdAt)}</td>
                <td className="px-3 py-2 text-gray-500">{formatDate(r.updatedAt)}</td>
                <td className="px-3 py-2 text-right space-x-3">
                  <button onClick={() => openEdit(r)} className="text-blue-600 hover:underline">Sửa</button>
                  <button
                    onClick={async () => {
                      await del(`/api/admin/brands/${r.id}`);
                      triggerReload();
                    }}
                    className="text-red-600"
                  >
                    Xóa
                  </button>
                </td>
              </tr>
            ))}
            {!rows.length && !loading && <tr><td className="px-3 py-6 text-center text-gray-500" colSpan={4}>Không có dữ liệu</td></tr>}
          </tbody>
        </table>
      </div>

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
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-800">Slug (tùy chọn)</label>
                <input
                  className="w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  placeholder="auto tạo nếu bỏ trống"
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-800">Logo URL (tuỳ chọn)</label>
                <input
                  className="w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  placeholder="Dán URL nếu đã host ở nơi khác"
                  value={form.logoUrl}
                  onChange={(e) => setForm({ ...form, logoUrl: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-800">Giới thiệu ngắn</label>
              <textarea
                className="w-full rounded-lg border px-3 py-2 text-sm min-h-[140px] focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                placeholder="Tóm tắt lĩnh vực, sản phẩm nổi bật..."
                value={form.summary}
                onChange={(e) => setForm({ ...form, summary: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-800">Logo tải lên</label>
            <p className="text-xs text-gray-500">
              Kích thước vuông, nền trong suốt càng tốt. Ảnh sẽ được chuyển sang WebP trước khi lưu.
            </p>
            <div className="flex items-start gap-4">
              <div className="relative h-28 w-28 overflow-hidden rounded-xl border bg-gray-50">
                {logoPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logoPreview} alt="Logo preview" className="h-full w-full object-contain" />
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
          {createStatus ? (
            <div
              className={`text-sm ${
                createStatus.type === "success" ? "text-green-600" : "text-red-600"
              }`}
            >
              {createStatus.message}
            </div>
          ) : (
            <div className="text-sm text-gray-500">Ảnh tải lên sẽ được xử lý và lưu tại Cloudinary.</div>
          )}
          <button
            onClick={handleCreateBrand}
            disabled={!form.name.trim() || createLoading}
            className="inline-flex items-center rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-green-700 disabled:opacity-60"
          >
            {createLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Lưu thương hiệu
          </button>
        </div>
      </div>
      {editing && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-lg space-y-4 p-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-lg">Chỉnh sửa thương hiệu</h2>
              <button onClick={() => setEditing(null)} className="text-sm text-gray-500 hover:text-gray-700">Đóng</button>
            </div>
            <div className="space-y-3">
              <input className="border rounded px-3 py-2 w-full" value={editForm.name} onChange={(e)=>setEditForm({...editForm, name:e.target.value})} placeholder="Tên" />
              <input className="border rounded px-3 py-2 w-full" value={editForm.slug} onChange={(e)=>setEditForm({...editForm, slug:e.target.value})} placeholder="Slug" />
              <input className="border rounded px-3 py-2 w-full" value={editForm.logoUrl} onChange={(e)=>setEditForm({...editForm, logoUrl:e.target.value})} placeholder="Logo URL" />
              <textarea className="border rounded px-3 py-2 w-full min-h-[100px]" value={editForm.summary} onChange={(e)=>setEditForm({...editForm, summary:e.target.value})} placeholder="Giới thiệu" />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setEditing(null)} className="px-3 py-2 rounded border">Hủy</button>
              <button
                onClick={async () => {
                  await patchJSON(`/api/admin/brands/${editing.id}`, {
                    name: editForm.name,
                    slug: editForm.slug || undefined,
                    logoUrl: editForm.logoUrl || undefined,
                    summary: editForm.summary || undefined,
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
