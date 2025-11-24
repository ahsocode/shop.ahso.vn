"use client";
import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Loader2, Upload, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ImageCropDialog } from "@/components/image/image-crop-dialog";
import { getJSON, postJSON, del, patchJSON, makeHeaders } from "../_lib/fetcher";

type Cate = { id: string; name: string };
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
  const [editForm, setEditForm] = useState({ name: "", slug: "", coverImage: "", description: "" });
  const [createCategoryId, setCreateCategoryId] = useState<string>("");
  const [createLoading, setCreateLoading] = useState(false);
  const [createStatus, setCreateStatus] = useState<{ type: "success" | "error"; message: string } | null>(
    null,
  );
  const coverFileRef = useRef<File | null>(null);
  const coverInputRef = useRef<HTMLInputElement | null>(null);
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
      const mapped = json.data.map((c) => ({ id: c.id, name: c.name }));
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
      const res = await postJSON<{ data: TypeRow }>("/api/admin/product-types", payload);
      const created = res.data;

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
      triggerReload();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Không thể tạo loại sản phẩm";
      setCreateStatus({ type: "error", message });
    } finally {
      setCreateLoading(false);
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
            <th className="px-3 py-2 text-left">Tạo lúc</th>
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
                <td className="px-3 py-2 text-gray-500">{formatDate(r.createdAt)}</td>
                <td className="px-3 py-2 text-gray-500">{formatDate(r.updatedAt)}</td>
                <td className="px-3 py-2 text-right space-x-3">
                  <button onClick={()=>openEdit(r)} className="text-blue-600 hover:underline">Sửa</button>
                  <button
                    onClick={async()=>{ 
                      try {
                        await del(`/api/admin/product-types/${r.id}`);
                        toast.success("Đã xóa loại sản phẩm");
                        triggerReload();
                      } catch (error) {
                        const message = error instanceof Error ? extractErrorMessage(error) : "Không thể xóa loại sản phẩm";
                        toast.error(message);
                      }
                    }} className="text-red-600">Xóa</button>
                </td>
              </tr>
            ))}
            {!rows.length && <tr><td className="px-3 py-6 text-center text-gray-500" colSpan={4}>Không có dữ liệu</td></tr>}
          </tbody>
        </table>
      </div>

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
          <div className="bg-white rounded-xl shadow-lg w-full max-w-lg space-y-4 p-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-lg">Chỉnh sửa loại sản phẩm</h2>
              <button onClick={()=>setEditing(null)} className="text-sm text-gray-500 hover:text-gray-700">Đóng</button>
            </div>
            <div className="space-y-3">
              <input className="border rounded px-3 py-2" value={editForm.name} onChange={(e)=>setEditForm({...editForm, name:e.target.value})} placeholder="Tên" />
              <input className="border rounded px-3 py-2" value={editForm.slug} onChange={(e)=>setEditForm({...editForm, slug:e.target.value})} placeholder="Slug" />
              <input className="border rounded px-3 py-2" value={editForm.coverImage} onChange={(e)=>setEditForm({...editForm, coverImage:e.target.value})} placeholder="Ảnh" />
              <textarea className="border rounded px-3 py-2 min-h-[100px]" value={editForm.description} onChange={(e)=>setEditForm({...editForm, description:e.target.value})} placeholder="Mô tả" />
            </div>
            <div className="flex justify-end gap-2">
              <button className="px-3 py-2 rounded border" onClick={()=>setEditing(null)}>Hủy</button>
              <button
                onClick={async()=>{
                  await patchJSON(`/api/admin/product-types/${editing.id}`, {
                    name: editForm.name,
                    slug: editForm.slug || undefined,
                    coverImage: editForm.coverImage || undefined,
                    description: editForm.description || undefined,
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
        return parsed.error;
      }
    } catch {
      // ignore
    }
    return error.message || "Đã có lỗi xảy ra";
  }
  return "Đã có lỗi xảy ra";
}
