"use client";

import { useEffect, useMemo, useState } from "react";
import { getJSON, postJSON, patchJSON, del } from "../_lib/fetcher";

type Supplier = {
  id: string;
  name: string;
  slug: string;
  code: string | null;
  contactPerson: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  taxCode: string | null;
  paymentTerms: string | null;
  minOrderValue: string | number | null;
  shippingFee: string | number | null;
  rating: number | null;
  totalOrders: number;
  productCount: number;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type ListResp = {
  data: Supplier[];
  meta: { total: number; page: number; pageSize: number };
};

const emptyForm = {
  name: "",
  slug: "",
  code: "",
  contactPerson: "",
  email: "",
  phone: "",
  address: "",
  paymentTerms: "",
  minOrderValue: "",
  shippingFee: "",
  rating: "",
  notes: "",
  isActive: true,
};

export default function SuppliersAdminPage() {
  const [keyword, setKeyword] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [rows, setRows] = useState<Supplier[]>([]);
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(() => ({ ...emptyForm }));
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [editForm, setEditForm] = useState(() => ({ ...emptyForm }));
  const [reloadToken, setReloadToken] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const triggerReload = () => setReloadToken((token) => token + 1);

  useEffect(() => {
    let ignore = false;
    const fetchSuppliers = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          q: searchQuery,
          page: String(page),
          pageSize: String(pageSize),
        });
        if (statusFilter !== "all") params.set("status", statusFilter);
        const data = await getJSON<ListResp>(`/api/admin/suppliers?${params.toString()}`);
        if (ignore) return;
        setRows(data.data);
        setTotal(data.meta.total);
      } catch (err) {
        if (!ignore) setError(err instanceof Error ? err.message : "Failed to load data");
      } finally {
        if (!ignore) setLoading(false);
      }
    };
    fetchSuppliers();
    return () => {
      ignore = true;
    };
  }, [page, pageSize, searchQuery, statusFilter, reloadToken]);

  const handleSearch = () => {
    const term = keyword.trim();
    setPage(1);
    setSearchQuery(term);
  };

  const parseNumber = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    const parsed = Number(trimmed.replace(/,/g, ""));
    return Number.isFinite(parsed) ? parsed : undefined;
  };

  const buildPayload = (payload: typeof form, opts?: { allowNull?: boolean }) => {
    const allowNull = opts?.allowNull ?? false;
    const result: Record<string, unknown> = {
      name: payload.name.trim(),
      isActive: payload.isActive,
    };
    const optionalFields: Array<[keyof typeof payload, string]> = [
      ["slug", "slug"],
      ["code", "code"],
      ["contactPerson", "contactPerson"],
      ["email", "email"],
      ["phone", "phone"],
      ["address", "address"],
      ["paymentTerms", "paymentTerms"],
      ["notes", "notes"],
    ];
    optionalFields.forEach(([key, name]) => {
      const raw = payload[key];
      if (typeof raw === "string") {
        const val = raw.trim();
        if (val) {
          result[name] = val;
        } else if (allowNull) {
          result[name] = null;
        }
      } else if (allowNull) {
        result[name] = raw ?? null;
      }
    });
    const minOrder = parseNumber(payload.minOrderValue);
    if (minOrder !== undefined) {
      result.minOrderValue = minOrder;
    } else if (allowNull) {
      result.minOrderValue = null;
    }
    const shipFee = parseNumber(payload.shippingFee);
    if (shipFee !== undefined) {
      result.shippingFee = shipFee;
    } else if (allowNull) {
      result.shippingFee = null;
    }
    const rating = parseNumber(payload.rating);
    if (rating !== undefined) {
      result.rating = rating;
    } else if (allowNull) {
      result.rating = null;
    }
    return result;
  };

  const handleCreate = async () => {
    if (!form.name.trim()) {
      alert("Tên nhà cung cấp là bắt buộc");
      return;
    }
    try {
      await postJSON("/api/admin/suppliers", buildPayload(form));
      setForm({ ...emptyForm });
      triggerReload();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Tạo thất bại");
    }
  };

  const startEdit = (row: Supplier) => {
    setEditing(row);
    setEditForm({
      name: row.name ?? "",
      slug: row.slug ?? "",
      code: row.code ?? "",
      contactPerson: row.contactPerson ?? "",
      email: row.email ?? "",
      phone: row.phone ?? "",
      address: row.address ?? "",
      paymentTerms: row.paymentTerms ?? "",
      minOrderValue: row.minOrderValue ? String(row.minOrderValue) : "",
      shippingFee: row.shippingFee ? String(row.shippingFee) : "",
      rating: row.rating != null ? String(row.rating) : "",
      notes: row.notes ?? "",
      isActive: row.isActive,
    });
  };

  const handleUpdate = async () => {
    if (!editing) return;
    if (!editForm.name.trim()) {
      alert("Tên nhà cung cấp là bắt buộc");
      return;
    }
    try {
      await patchJSON(`/api/admin/suppliers/${editing.id}`, buildPayload(editForm, { allowNull: true }));
      setEditing(null);
      triggerReload();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Cập nhật thất bại");
    }
  };

  const handleDelete = async (row: Supplier) => {
    if (!confirm(`Xóa nhà cung cấp ${row.name}?`)) return;
    try {
      await del(`/api/admin/suppliers/${row.id}`);
      triggerReload();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Xóa thất bại");
    }
  };

  const pagedInfo = useMemo(() => {
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    return { totalPages };
  }, [total, pageSize]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3 items-center">
        <input
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="Tìm nhà cung cấp..."
          className="border rounded px-3 py-2 min-w-[240px]"
        />
        <button onClick={handleSearch} className="px-3 py-2 rounded bg-blue-600 text-white">
          Tìm
        </button>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          className="border rounded px-3 py-2"
        >
          <option value="all">Tất cả trạng thái</option>
          <option value="active">Đang hoạt động</option>
          <option value="inactive">Ngưng hoạt động</option>
        </select>
        <button onClick={() => triggerReload()} className="px-3 py-2 rounded border">
          Refresh
        </button>
        {loading && <span className="text-sm text-gray-500">Đang tải...</span>}
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>

      <div className="rounded border bg-white overflow-hidden">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <div className="font-semibold">Danh sách nhà cung cấp ({total})</div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="px-3 py-2">Tên</th>
                <th className="px-3 py-2">Mã</th>
                <th className="px-3 py-2">Liên hệ</th>
                <th className="px-3 py-2">Điện thoại</th>
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2">Đánh giá</th>
                <th className="px-3 py-2">Đơn hàng</th>
                <th className="px-3 py-2">SP liên kết</th>
                <th className="px-3 py-2">Trạng thái</th>
                <th className="px-3 py-2 text-right">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t">
                  <td className="px-3 py-2">
                    <div className="font-semibold">{row.name}</div>
                    <div className="text-xs text-gray-500">{row.slug}</div>
                  </td>
                  <td className="px-3 py-2 text-gray-600">{row.code || "—"}</td>
                  <td className="px-3 py-2 text-gray-700">{row.contactPerson || "—"}</td>
                  <td className="px-3 py-2">{row.phone || "—"}</td>
                  <td className="px-3 py-2">{row.email || "—"}</td>
                  <td className="px-3 py-2">{row.rating != null ? row.rating.toFixed(1) : "—"}</td>
                  <td className="px-3 py-2">{row.totalOrders}</td>
                  <td className="px-3 py-2">{row.productCount}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        row.isActive ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-600"
                      }`}
                    >
                      {row.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right space-x-3 whitespace-nowrap">
                    <button onClick={() => startEdit(row)} className="text-blue-600 hover:underline">
                      Sửa
                    </button>
                    <button onClick={() => handleDelete(row)} className="text-red-600 hover:underline">
                      Xóa
                    </button>
                  </td>
                </tr>
              ))}
              {!rows.length && !loading && (
                <tr>
                  <td className="px-3 py-6 text-center text-gray-500" colSpan={10}>
                    Không có nhà cung cấp nào
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t flex items-center justify-between text-sm text-gray-600">
          <div>
            Trang {page}/{pagedInfo.totalPages}
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
              disabled={page >= pagedInfo.totalPages}
              onClick={() => setPage((p) => Math.min(pagedInfo.totalPages, p + 1))}
              className="px-3 py-1 rounded border disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="border rounded bg-white p-4 space-y-3">
          <div className="font-semibold text-lg">Tạo nhà cung cấp</div>
          <FormFields form={form} setForm={setForm} />
          <button onClick={handleCreate} className="px-3 py-2 rounded bg-green-600 text-white">
            Tạo mới
          </button>
        </div>

        {editing && (
          <div className="border rounded bg-white p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="font-semibold text-lg">Chỉnh sửa: {editing.name}</div>
              <button onClick={() => setEditing(null)} className="text-sm text-gray-500 hover:underline">
                Đóng
              </button>
            </div>
            <FormFields form={editForm} setForm={setEditForm} />
            <div className="flex gap-2">
              <button onClick={handleUpdate} className="px-3 py-2 rounded bg-blue-600 text-white">
                Lưu thay đổi
              </button>
              <button onClick={() => setEditing(null)} className="px-3 py-2 rounded border">
                Hủy
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

type FormProps = {
  form: typeof emptyForm;
  setForm: (value: typeof emptyForm | ((prev: typeof emptyForm) => typeof emptyForm)) => void;
};

function FormFields({ form, setForm }: FormProps) {
  const update = (key: keyof typeof form, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="grid gap-3">
      <label className="text-sm font-medium text-gray-700">
        Tên nhà cung cấp *
        <input
          className="mt-1 w-full border rounded px-3 py-2"
          value={form.name}
          onChange={(e) => update("name", e.target.value)}
          placeholder="Công ty TNHH ..."
        />
      </label>
      <div className="grid md:grid-cols-2 gap-3">
        <label className="text-sm font-medium text-gray-700">
          Slug
          <input
            className="mt-1 w-full border rounded px-3 py-2"
            value={form.slug}
            onChange={(e) => update("slug", e.target.value)}
            placeholder="auto nếu trống"
          />
        </label>
        <label className="text-sm font-medium text-gray-700">
          Mã
          <input
            className="mt-1 w-full border rounded px-3 py-2"
            value={form.code}
            onChange={(e) => update("code", e.target.value)}
            placeholder="SUP-001"
          />
        </label>
      </div>
      <div className="grid md:grid-cols-2 gap-3">
        <label className="text-sm font-medium text-gray-700">
          Người liên hệ
          <input
            className="mt-1 w-full border rounded px-3 py-2"
            value={form.contactPerson}
            onChange={(e) => update("contactPerson", e.target.value)}
          />
        </label>
        <label className="text-sm font-medium text-gray-700">
          Email
          <input
            className="mt-1 w-full border rounded px-3 py-2"
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            placeholder="contact@example.com"
          />
        </label>
      </div>
      <div className="grid md:grid-cols-2 gap-3">
        <label className="text-sm font-medium text-gray-700">
          Điện thoại
          <input
            className="mt-1 w-full border rounded px-3 py-2"
            value={form.phone}
            onChange={(e) => update("phone", e.target.value)}
            placeholder="+84..."
          />
        </label>
        <label className="text-sm font-medium text-gray-700">
          Điều khoản thanh toán
          <input
            className="mt-1 w-full border rounded px-3 py-2"
            value={form.paymentTerms}
            onChange={(e) => update("paymentTerms", e.target.value)}
            placeholder="COD, Net 30..."
          />
        </label>
      </div>
      <label className="text-sm font-medium text-gray-700">
        Địa chỉ
        <textarea
          className="mt-1 w-full border rounded px-3 py-2"
          rows={3}
          value={form.address}
          onChange={(e) => update("address", e.target.value)}
        />
      </label>
      <div className="grid md:grid-cols-3 gap-3">
        <label className="text-sm font-medium text-gray-700">
          Đơn tối thiểu (VND)
          <input
            className="mt-1 w-full border rounded px-3 py-2"
            value={form.minOrderValue}
            onChange={(e) => update("minOrderValue", e.target.value)}
            placeholder="1000000"
          />
        </label>
        <label className="text-sm font-medium text-gray-700">
          Phí ship (VND)
          <input
            className="mt-1 w-full border rounded px-3 py-2"
            value={form.shippingFee}
            onChange={(e) => update("shippingFee", e.target.value)}
            placeholder="50000"
          />
        </label>
        <label className="text-sm font-medium text-gray-700">
          Rating
          <input
            className="mt-1 w-full border rounded px-3 py-2"
            value={form.rating}
            onChange={(e) => update("rating", e.target.value)}
            placeholder="0-5"
          />
        </label>
      </div>
      <label className="text-sm font-medium text-gray-700">
        Ghi chú nội bộ
        <textarea
          className="mt-1 w-full border rounded px-3 py-2"
          rows={3}
          value={form.notes}
          onChange={(e) => update("notes", e.target.value)}
        />
      </label>
      <label className="inline-flex items-center gap-2 text-sm font-medium text-gray-700">
        <input
          type="checkbox"
          checked={form.isActive}
          onChange={(e) => update("isActive", e.target.checked)}
        />
        Đang hoạt động
      </label>
    </div>
  );
}
