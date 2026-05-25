"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { confirmToast } from "@/lib/confirm-toast";
import { getJSON, del, makeHeaders } from "../_lib/fetcher";

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
  const [loading, setLoading] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState<Brand | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

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

  const triggerReload = () => setReloadToken((token) => token + 1);

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


  const handleSearch = () => {
    const term = keyword.trim();
    setPage(1);
    if (term === searchQuery) {
      triggerReload();
    } else {
      setSearchQuery(term);
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
        <Link
          href="/admin/brands/create"
          className="inline-flex items-center rounded bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-700"
        >
          Thêm thương hiệu
        </Link>
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
                    <Link
                      href={`/admin/brands/${r.id}/update`}
                      className="w-16 h-16 rounded border border-dashed border-blue-200 bg-blue-50/60 flex flex-col items-center justify-center text-[11px] text-blue-700 hover:bg-blue-50 transition"
                    >
                      <Upload className="w-4 h-4 mb-1" />
                      Thêm logo
                    </Link>
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
                  <Link
                    href={`/admin/brands/${r.id}/update`}
                    className="text-blue-600 hover:underline"
                  >
                    Sửa
                  </Link>
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

    </div>
  );
}
