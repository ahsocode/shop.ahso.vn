"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { getJSON, postJSON, patchJSON, del } from "../_lib/fetcher";

type CategoryRow = {
  id: string;
  name: string;
  description: string | null;
};

const EMPTY_FORM = {
  id: "",
  name: "",
  description: "",
};

export default function AdminSoftwareCategoriesPage() {
  const [rows, setRows] = useState<CategoryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const load = async () => {
    setLoading(true);
    try {
      const res = await getJSON<{ data: CategoryRow[] }>("/api/admin/software-categories");
      setRows(res.data);
    } catch (error) {
      toast.error("Không thể tải danh mục phần mềm");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const resetForm = () => setForm(EMPTY_FORM);

  const handleSubmit = async () => {
    if (!form.name) {
      toast.error("Vui lòng nhập tên danh mục");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        description: form.description,
      };
      if (form.id) {
        await patchJSON(`/api/admin/software-categories/${form.id}`, payload);
        toast.success("Đã cập nhật danh mục");
      } else {
        await postJSON("/api/admin/software-categories", payload);
        toast.success("Đã tạo danh mục");
      }
      resetForm();
      await load();
    } catch (error) {
      toast.error("Không thể lưu danh mục");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row: CategoryRow) => {
    if (!confirm(`Xóa danh mục "${row.name}"?`)) return;
    try {
      await del(`/api/admin/software-categories/${row.id}`);
      toast.success("Đã xóa danh mục");
      await load();
    } catch (error) {
      toast.error("Không thể xóa danh mục");
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">Danh mục phần mềm</h1>

      <div className="grid gap-6 lg:grid-cols-[1fr,1fr]">
        <div className="rounded-xl border bg-white p-4 shadow-sm space-y-3">
          <h2 className="font-semibold text-slate-900">
            {form.id ? "Chỉnh sửa danh mục" : "Tạo danh mục"}
          </h2>
          <div className="grid gap-3">
            <label className="text-xs font-semibold text-gray-600">
              Tên danh mục
              <input
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                className="mt-1 w-full rounded border px-3 py-2 text-sm"
              />
            </label>
            <label className="text-xs font-semibold text-gray-600">
              Mô tả
              <textarea
                value={form.description}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, description: e.target.value }))
                }
                className="mt-1 w-full rounded border px-3 py-2 text-sm"
                rows={3}
              />
            </label>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSubmit}
              className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              disabled={saving}
            >
              {saving ? "Đang lưu..." : "Lưu"}
            </button>
            {form.id && (
              <button
                type="button"
                onClick={resetForm}
                className="text-xs text-gray-500 hover:underline"
              >
                Tạo mới
              </button>
            )}
          </div>
        </div>

        <div className="rounded-xl border bg-white p-4 shadow-sm space-y-3">
          <h2 className="font-semibold text-slate-900">Danh sách danh mục</h2>
          {loading ? (
            <div className="text-sm text-gray-500">Đang tải...</div>
          ) : rows.length === 0 ? (
            <div className="text-sm text-gray-500">Chưa có danh mục.</div>
          ) : (
            <div className="space-y-2">
              {rows.map((row) => (
                <div
                  key={row.id}
                  className="rounded-lg border border-gray-200 px-3 py-2 flex items-center justify-between"
                >
                  <div>
                    <div className="font-semibold text-slate-900">{row.name}</div>
                    {row.description ? (
                      <div className="text-xs text-gray-500">{row.description}</div>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() =>
                        setForm({
                          id: row.id,
                          name: row.name,
                          description: row.description ?? "",
                        })
                      }
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
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
