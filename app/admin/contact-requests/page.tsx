"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { confirmToast } from "@/lib/confirm-toast";
import { getJSON, patchJSON, del } from "../_lib/fetcher";

type ContactRow = {
  id: string;
  code: string;
  fullName: string;
  phone: string;
  email: string | null;
  company: string | null;
  subject: string | null;
  message: string;
  source: string;
  status: string;
  priority: string;
  assignedTo: string | null;
  response: string | null;
  respondedAt: string | null;
  respondedBy: string | null;
  internalNotes: string | null;
  createdAt: string;
  updatedAt: string;
  contactType: { id: string; name: string } | null;
};

type ListResp = {
  data: ContactRow[];
  meta: { total: number; page: number; pageSize: number };
};

type StaffOption = {
  id: string;
  fullName: string | null;
  email: string | null;
  role: string;
};

const STATUS_OPTIONS = [
  { value: "", label: "Tất cả" },
  { value: "new", label: "Mới" },
  { value: "in_progress", label: "Đang xử lý" },
  { value: "responded", label: "Đã phản hồi" },
  { value: "closed", label: "Đã đóng" },
  { value: "spam", label: "Spam" },
] as const;

const PRIORITY_OPTIONS = [
  { value: "", label: "Tất cả" },
  { value: "low", label: "Thấp" },
  { value: "normal", label: "Trung bình" },
  { value: "high", label: "Cao" },
  { value: "urgent", label: "Khẩn cấp" },
] as const;

const STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-100 text-blue-700",
  in_progress: "bg-yellow-100 text-yellow-700",
  responded: "bg-green-100 text-green-700",
  closed: "bg-gray-200 text-gray-600",
  spam: "bg-red-100 text-red-700",
};

const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-gray-100 text-gray-600",
  normal: "bg-blue-50 text-blue-700",
  high: "bg-orange-100 text-orange-700",
  urgent: "bg-red-100 text-red-700",
};

export default function ContactRequestsPage() {
  const [rows, setRows] = useState<ContactRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [filters, setFilters] = useState({ q: "", status: "", priority: "" });
  const [selected, setSelected] = useState<ContactRow | null>(null);
  const [form, setForm] = useState({
    priority: "",
    assignedTo: "",
    response: "",
    internalNotes: "",
  });
  const [staffOptions, setStaffOptions] = useState<StaffOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const triggerReload = () => setReloadToken((v) => v + 1);

  const selectedId = selected?.id;

  useEffect(() => {
    let ignore = false;
    const fetchContacts = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          page: String(page),
          pageSize: String(pageSize),
        });
        if (filters.q) params.set("q", filters.q);
        if (filters.status) params.set("status", filters.status);
        if (filters.priority) params.set("priority", filters.priority);
        const json = await getJSON<ListResp>(`/api/admin/contacts?${params.toString()}`);
        if (ignore) return;
        setRows(json.data);
        setTotal(json.meta.total);
        if (selectedId) {
          const refreshed = json.data.find((r) => r.id === selectedId);
          if (refreshed) {
            setSelected(refreshed);
            setForm({
              priority: refreshed.priority,
              assignedTo: refreshed.assignedTo || "",
              response: refreshed.response || "",
              internalNotes: refreshed.internalNotes || "",
            });
          }
        }
      } catch (err) {
        if (!ignore) setError(err instanceof Error ? err.message : "Không thể tải dữ liệu");
      } finally {
        if (!ignore) setLoading(false);
      }
    };
    fetchContacts();
    return () => {
      ignore = true;
    };
  }, [page, pageSize, filters, reloadToken, selectedId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const resp = await getJSON<{ data: StaffOption[] }>("/api/admin/staff-list");
        if (cancelled) return;
        setStaffOptions(resp.data);
      } catch (err) {
        if (!cancelled) {
          console.error("Failed to load staff list", err);
          toast.error("Không thể tải danh sách staff");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize]);

  const applySearch = () => {
    setPage(1);
    setFilters((prev) => ({ ...prev, q: keyword.trim() }));
  };

  const toggleSelectRow = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id],
    );
  };

  const toggleSelectAll = (checked: boolean, rows: ContactRow[]) => {
    if (checked) setSelectedIds(rows.map((r) => r.id));
    else setSelectedIds([]);
  };

  const handleSelect = (row: ContactRow) => {
    setSelected(row);
    setForm({
      priority: row.priority,
      assignedTo: row.assignedTo || "",
      response: row.response || "",
      internalNotes: row.internalNotes || "",
    });
  };

  const handleUpdate = async () => {
    if (!selected) return;
    try {
      await patchJSON(`/api/admin/contacts/${selected.id}`, {
        priority: form.priority,
        assignedTo: form.assignedTo.trim(),
        response: form.response.trim(),
        internalNotes: form.internalNotes.trim(),
      });
      toast.success("Đã cập nhật yêu cầu liên hệ");
      triggerReload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Cập nhật thất bại");
    }
  };

  const handleBulkAssign = async (staffId: string) => {
    if (!staffId) {
      toast.error("Vui lòng chọn staff để gán");
      return;
    }
    const ids = selectedIds;
    if (!ids.length) {
      toast.error("Chọn ít nhất 1 yêu cầu");
      return;
    }
    try {
      await Promise.all(
        ids.map((id) =>
          patchJSON(`/api/admin/contacts/${id}`, {
            assignedTo: staffId,
          }),
        ),
      );
      toast.success("Đã gán staff cho các yêu cầu đã chọn");
      setSelectedIds([]);
      triggerReload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gán thất bại");
    }
  };

  const handleBulkDelete = async () => {
    if (!selectedIds.length) {
      toast.error("Chọn ít nhất 1 yêu cầu để xóa");
      return;
    }
    const confirmed = await confirmToast(`Xóa ${selectedIds.length} yêu cầu đã chọn?`);
    if (!confirmed) return;
    try {
      await Promise.all(selectedIds.map((id) => del(`/api/admin/contacts/${id}`)));
      toast.success("Đã xóa các yêu cầu đã chọn");
      setSelectedIds([]);
      triggerReload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Xóa thất bại");
    }
  };

  const handleDelete = async (row: ContactRow) => {
    const confirmed = await confirmToast(`Xóa yêu cầu liên hệ ${row.fullName}?`);
    if (!confirmed) return;
    try {
      await del(`/api/admin/contacts/${row.id}`);
      if (selected?.id === row.id) setSelected(null);
      triggerReload();
      toast.success("Đã xóa yêu cầu liên hệ");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Xóa thất bại");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3 items-center">
        <input
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="Tìm theo mã, tên, email, nội dung..."
          className="border rounded px-3 py-2 min-w-[240px]"
        />
        <button onClick={applySearch} className="px-3 py-2 rounded bg-blue-600 text-white">
          Tìm
        </button>
        <select
          value={filters.status}
          onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
          className="border rounded px-3 py-2"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <select
          value={filters.priority}
          onChange={(e) => setFilters((prev) => ({ ...prev, priority: e.target.value }))}
          className="border rounded px-3 py-2"
        >
          {PRIORITY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <button onClick={triggerReload} className="px-3 py-2 rounded border">
          Refresh
        </button>
        {loading && <span className="text-sm text-gray-500">Đang tải...</span>}
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>

      <div className="rounded border bg-white overflow-hidden">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <div className="font-semibold">Yêu cầu liên hệ ({total})</div>
          <div className="flex items-center gap-3 text-sm">
            <select
              className="border rounded px-3 py-2"
              value={form.assignedTo}
              onChange={(e) => setForm((prev) => ({ ...prev, assignedTo: e.target.value }))}
            >
              <option value="">Chọn staff để gán nhanh</option>
              {staffOptions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.fullName || s.email || s.id} ({s.role.toLowerCase()})
                </option>
              ))}
            </select>
            <button
              className="px-3 py-2 rounded bg-blue-600 text-white disabled:opacity-50"
              onClick={() => handleBulkAssign(form.assignedTo)}
              disabled={!selectedIds.length}
            >
              Gán cho {selectedIds.length || ""} yêu cầu
            </button>
            <button
              className="px-3 py-2 rounded border border-red-300 text-red-600 disabled:opacity-50"
              onClick={handleBulkDelete}
              disabled={!selectedIds.length}
            >
              Xóa {selectedIds.length || ""} yêu cầu
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="px-3 py-2">
                  <input
                    type="checkbox"
                    checked={selectedIds.length === rows.length && rows.length > 0}
                    onChange={(e) => toggleSelectAll(e.target.checked, rows)}
                  />
                </th>
                <th className="px-3 py-2">Khách hàng</th>
                <th className="px-3 py-2">Thông tin</th>
                <th className="px-3 py-2">Nguồn</th>
                <th className="px-3 py-2">Ưu tiên</th>
                <th className="px-3 py-2">Trạng thái</th>
                <th className="px-3 py-2">Tạo lúc</th>
                <th className="px-3 py-2 text-right">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t">
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(row.id)}
                      onChange={() => toggleSelectRow(row.id)}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <div className="font-semibold">{row.fullName}</div>
                    <div className="text-xs text-gray-500">{row.email || row.phone}</div>
                    {row.company && <div className="text-xs text-gray-400">{row.company}</div>}
                  </td>
                  <td className="px-3 py-2 text-gray-600">
                    <div className="font-medium">{row.subject || "(Không tiêu đề)"}</div>
                    <div className="text-xs text-gray-500 line-clamp-2">{row.message}</div>
                  </td>
                  <td className="px-3 py-2 text-gray-500 capitalize">
                    {row.contactType?.name || row.source}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`px-2 py-1 rounded text-xs ${PRIORITY_COLORS[row.priority] || "bg-gray-100 text-gray-600"}`}
                    >
                      {row.priority}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`px-2 py-1 rounded text-xs ${STATUS_COLORS[row.status] || "bg-gray-100 text-gray-600"}`}
                    >
                      {row.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-gray-500">
                    {new Date(row.createdAt).toLocaleString("vi-VN")}
                  </td>
                  <td className="px-3 py-2 text-right space-x-3">
                    <button onClick={() => handleSelect(row)} className="text-blue-600 hover:underline">
                      Xem
                    </button>
                    <button onClick={() => handleDelete(row)} className="text-red-600 hover:underline">
                      Xóa
                    </button>
                  </td>
                </tr>
              ))}
              {!rows.length && !loading && (
                <tr>
                  <td className="px-3 py-6 text-center text-gray-500" colSpan={7}>
                    Không có yêu cầu
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t flex items-center justify-between text-sm text-gray-600">
          <div>
            Trang {page}/{totalPages}
          </div>
          <div className="space-x-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1 rounded border disabled:opacity-50"
            >
              Prev
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="px-3 py-1 rounded border disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>

  {selected && (
        <div className="rounded border bg-white p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-lg font-semibold">{selected.fullName}</div>
              <div className="text-sm text-gray-500">Mã: {selected.code}</div>
            </div>
            <button onClick={() => setSelected(null)} className="text-sm text-gray-500 hover:underline">
              Đóng
            </button>
          </div>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-gray-500">Email</div>
              <div>{selected.email || "—"}</div>
            </div>
            <div>
              <div className="text-gray-500">Điện thoại</div>
              <div>{selected.phone}</div>
            </div>
            <div>
              <div className="text-gray-500">Công ty</div>
              <div>{selected.company || "—"}</div>
            </div>
            <div>
              <div className="text-gray-500">Nguồn</div>
              <div>{selected.source}</div>
            </div>
          </div>
          <div>
            <div className="text-gray-500 text-sm">Nội dung</div>
            <div className="whitespace-pre-line border rounded p-3 mt-1 text-sm bg-gray-50">
              {selected.message}
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <label className="text-sm font-medium text-gray-700">
              Ưu tiên
              <select
                className="mt-1 w-full border rounded px-3 py-2"
                value={form.priority}
                onChange={(e) => setForm((prev) => ({ ...prev, priority: e.target.value }))}
              >
                {PRIORITY_OPTIONS.filter((opt) => opt.value !== "").map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <label className="text-sm font-medium text-gray-700">
              Gán cho
              <select
                className="mt-1 w-full border rounded px-3 py-2"
                value={form.assignedTo}
                onChange={(e) => setForm((prev) => ({ ...prev, assignedTo: e.target.value }))}
              >
                <option value="">Chưa gán</option>
                {staffOptions.map((staff) => (
                  <option key={staff.id} value={staff.id}>
                    {staff.fullName || staff.email || staff.id} ({staff.role.toLowerCase()})
                  </option>
                ))}
                {!staffOptions.find((s) => s.id === form.assignedTo) && form.assignedTo && (
                  <option value={form.assignedTo}>{`Người dùng: ${form.assignedTo}`}</option>
                )}
              </select>
            </label>
            <label className="text-sm font-medium text-gray-700">
              Ghi chú nội bộ
              <textarea
                className="mt-1 w-full border rounded px-3 py-2"
                rows={3}
                value={form.internalNotes}
                onChange={(e) => setForm((prev) => ({ ...prev, internalNotes: e.target.value }))}
              />
            </label>
          </div>
          <label className="text-sm font-medium text-gray-700 block">
            Nội dung phản hồi
            <textarea
              className="mt-1 w-full border rounded px-3 py-2"
              rows={4}
              value={form.response}
              onChange={(e) => setForm((prev) => ({ ...prev, response: e.target.value }))}
            />
          </label>
          <div className="flex gap-3">
            <button onClick={handleUpdate} className="px-3 py-2 rounded bg-blue-600 text-white">
              Lưu cập nhật
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
