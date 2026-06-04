"use client";

import { useCallback, useEffect, useState } from "react";
import { Edit3, FolderTree, Loader2, Plus, Save, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { getJSON, postJSON, patchJSON, del } from "@/app/admin/_lib/fetcher";
import { confirmToast } from "@/lib/confirm-toast";
import { ContentManagementNav } from "@/components/admin/content/ContentManagementNav";

type CategoryRow = {
  id: string;
  name: string;
  description: string | null;
};

type CategoryKind = "software" | "solution";

const EMPTY_FORM = {
  id: "",
  name: "",
  description: "",
};

const configByKind = {
  software: {
    apiBase: "/api/admin/software-categories",
    title: "Danh mục phần mềm",
    eyebrow: "Phần mềm",
    description: "Tổ chức các bài viết phần mềm theo nhóm nội dung rõ ràng.",
    emptyText: "Chưa có danh mục phần mềm.",
  },
  solution: {
    apiBase: "/api/admin/solution-categories",
    title: "Danh mục giải pháp",
    eyebrow: "Giải pháp",
    description: "Tổ chức các bài viết giải pháp theo nhóm nội dung rõ ràng.",
    emptyText: "Chưa có danh mục giải pháp.",
  },
} as const;

export function ContentCategoryManager({ kind }: { kind: CategoryKind }) {
  const config = configByKind[kind];
  const [rows, setRows] = useState<CategoryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getJSON<{ data: CategoryRow[] }>(config.apiBase);
      setRows(res.data);
    } catch {
      toast.error(`Không thể tải ${config.title.toLowerCase()}.`);
    } finally {
      setLoading(false);
    }
  }, [config.apiBase, config.title]);

  useEffect(() => {
    void load();
  }, [load]);

  const resetForm = () => setForm(EMPTY_FORM);

  const handleSubmit = async () => {
    const name = form.name.trim();
    if (!name) {
      toast.warning("Vui lòng nhập tên danh mục.");
      return;
    }

    setSaving(true);
    const toastId = toast.loading(form.id ? "Đang cập nhật danh mục..." : "Đang tạo danh mục...");

    try {
      const payload = {
        name,
        description: form.description.trim(),
      };

      if (form.id) {
        await patchJSON(`${config.apiBase}/${form.id}`, payload);
        toast.success("Đã cập nhật danh mục.", { id: toastId });
      } else {
        await postJSON(config.apiBase, payload);
        toast.success("Đã tạo danh mục.", { id: toastId });
      }

      resetForm();
      await load();
    } catch {
      toast.error("Không thể lưu danh mục.", { id: toastId });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row: CategoryRow) => {
    const accepted = await confirmToast(`Xóa danh mục "${row.name}"?`, {
      description: "Thao tác này không thể hoàn tác.",
      confirmText: "Xóa danh mục",
      cancelText: "Giữ lại",
      variant: "modal",
    });
    if (!accepted) return;

    const toastId = toast.loading("Đang xóa danh mục...");
    try {
      await del(`${config.apiBase}/${row.id}`);
      toast.success("Đã xóa danh mục.", { id: toastId });
      await load();
      if (form.id === row.id) resetForm();
    } catch {
      toast.error("Không thể xóa danh mục.", { id: toastId });
    }
  };

  return (
    <div className="space-y-6">
      <ContentManagementNav />

      <header className="grid gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">{config.eyebrow}</p>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-slate-950">{config.title}</h1>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">{config.description}</p>
          </div>
          <div className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
            <span className="font-semibold text-slate-950">{rows.length}</span> danh mục
          </div>
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
        <section className="rounded-md border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-blue-50 text-blue-700">
                {form.id ? <Edit3 className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-950">
                  {form.id ? "Chỉnh sửa danh mục" : "Tạo danh mục"}
                </h2>
                <p className="mt-1 text-sm text-slate-600">Tên rõ ràng giúp admin lọc bài viết nhanh hơn.</p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 p-5">
            <label className="grid gap-1.5 text-sm font-medium text-slate-700">
              Tên danh mục
              <input
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                className="h-10 rounded-md border border-slate-300 px-3 text-sm font-normal text-slate-950 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                placeholder="Ví dụ: Quản lý vận hành"
              />
            </label>

            <label className="grid gap-1.5 text-sm font-medium text-slate-700">
              Mô tả
              <textarea
                value={form.description}
                onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                className="min-h-28 rounded-md border border-slate-300 px-3 py-2 text-sm font-normal text-slate-950 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                placeholder="Mô tả ngắn về nhóm nội dung này."
              />
            </label>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={saving}
                className="inline-flex h-10 items-center gap-2 rounded-md bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {form.id ? "Lưu thay đổi" : "Tạo danh mục"}
              </button>

              {form.id && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  <X className="h-4 w-4" />
                  Hủy sửa
                </button>
              )}
            </div>
          </div>
        </section>

        <section className="rounded-md border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-5 py-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-slate-950">Danh sách danh mục</h2>
                <p className="mt-1 text-sm text-slate-600">Chọn danh mục để chỉnh sửa hoặc xóa.</p>
              </div>
              <FolderTree className="h-5 w-5 text-slate-400" />
            </div>
          </div>

          {loading ? (
            <div className="grid min-h-56 place-items-center text-sm text-slate-500">
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                Đang tải danh mục...
              </span>
            </div>
          ) : rows.length === 0 ? (
            <div className="grid min-h-56 place-items-center px-5 text-center text-sm text-slate-500">
              {config.emptyText}
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {rows.map((row) => (
                <article key={row.id} className="grid gap-3 px-5 py-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-semibold text-slate-950">{row.name}</h3>
                    <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-600">
                      {row.description || "Chưa có mô tả cho danh mục này."}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setForm({
                          id: row.id,
                          name: row.name,
                          description: row.description ?? "",
                        })
                      }
                      className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      <Edit3 className="h-4 w-4" />
                      Sửa
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(row)}
                      className="inline-flex h-9 items-center gap-2 rounded-md border border-red-200 bg-white px-3 text-sm font-semibold text-red-600 transition hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                      Xóa
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
