"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, CheckCheck } from "lucide-react";
import { toast } from "sonner";
import type { OrderStatus } from "@/dto/order.dto";

const STATUS_OPTIONS: { value: OrderStatus; label: string }[] = [
  { value: "pending", label: "Chờ thanh toán" },
  { value: "paid", label: "Đã thanh toán" },
  { value: "processing", label: "Đang xử lý" },
  { value: "shipped", label: "Đã gửi hàng" },
  { value: "delivered", label: "Đã giao" },
  { value: "cancelled", label: "Đã hủy" },
];

function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  if (typeof window !== "undefined") {
    const token = window.localStorage.getItem("token");
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

type Props = {
  orderId: string;
  initialStatus: OrderStatus;
  initialNote: string;
  initialShippingMethod: string;
};

export default function StatusManager({
  orderId,
  initialStatus,
  initialNote,
  initialShippingMethod,
}: Props) {
  const [status, setStatus] = useState<OrderStatus>(initialStatus);
  const [note, setNote] = useState(initialNote);
  const [shippingMethod, setShippingMethod] = useState(initialShippingMethod);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setStatus(initialStatus);
    setNote(initialNote);
    setShippingMethod(initialShippingMethod);
  }, [initialStatus, initialNote, initialShippingMethod]);

  const hasChanges = useMemo(() => {
    return (
      status !== initialStatus ||
      note.trim() !== (initialNote || "").trim() ||
      shippingMethod.trim() !== (initialShippingMethod || "").trim()
    );
  }, [status, note, shippingMethod, initialStatus, initialNote, initialShippingMethod]);

  async function handleSave() {
    if (!hasChanges) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/staff/orders/${orderId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        credentials: "include",
        body: JSON.stringify({
          status,
          note: note.trim(),
          shippingMethod: shippingMethod.trim(),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        const message =
          typeof data === "object" && data && "error" in data && typeof data.error === "string"
            ? data.error
            : "Không thể cập nhật đơn hàng";
        throw new Error(message);
      }
      toast.success("Đã cập nhật trạng thái đơn hàng");
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Không thể cập nhật đơn hàng";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  function handleReset() {
    setStatus(initialStatus);
    setNote(initialNote);
    setShippingMethod(initialShippingMethod);
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-4">
      <div>
        <p className="font-semibold text-slate-900">Điều chỉnh trạng thái</p>
        <p className="text-sm text-slate-500">
          Cập nhật tình trạng xử lý, ghi chú nội bộ và phương thức giao hàng cho đơn hàng này.
        </p>
      </div>
      <div className="space-y-3">
        <div>
          <label className="text-xs font-semibold text-slate-500">Trạng thái</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as OrderStatus)}
            className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-400 outline-none"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500">Phương thức giao hàng</label>
          <input
            value={shippingMethod}
            onChange={(e) => setShippingMethod(e.target.value)}
            placeholder="Ví dụ: Giao nhanh J&T"
            className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-400 outline-none"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500">Ghi chú nội bộ</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={4}
            className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-400 outline-none resize-none"
            placeholder="Ghi chú dành cho CSKH/kho..."
          />
        </div>
      </div>
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={handleReset}
          disabled={!hasChanges || saving}
          className="text-sm text-slate-500 hover:text-slate-700 disabled:opacity-50"
        >
          Đặt lại
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={!hasChanges || saving}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCheck className="w-4 h-4" />}
          Lưu thay đổi
        </button>
      </div>
    </div>
  );
}
