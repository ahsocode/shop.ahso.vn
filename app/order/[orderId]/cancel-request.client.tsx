"use client";

import { useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { OrderStatus } from "@/dto/order.dto";

type Props = {
  orderId: string;
  status: OrderStatus;
  cancelRequestReason: string | null;
};

// Các trạng thái KHÁCH ĐƯỢC quyền yêu cầu hủy
const canRequestCancel = (status: OrderStatus) =>
  status === "pending" || status === "paid" || status === "processing";

function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  if (typeof window !== "undefined") {
    const token = window.localStorage.getItem("token");
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

export default function CancelRequestSection({
  orderId,
  status,
  cancelRequestReason,
}: Props) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Nếu đã có yêu cầu hủy trước đó → hiển thị info, không cho gửi thêm
  if (status === "cancel_requested") {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 space-y-2 text-sm text-amber-900">
        <div className="flex items-center gap-2 font-medium">
          <AlertTriangle className="h-4 w-4" />
          Yêu cầu hủy đơn hàng đang được xem xét
        </div>
        <p>
          Đơn hàng này đã được gửi yêu cầu hủy. Bộ phận CSKH sẽ kiểm tra và phản hồi sớm
          qua email hoặc điện thoại.
        </p>
        {cancelRequestReason ? (
          <div className="mt-2 rounded-xl bg-white/60 p-3 text-xs border border-amber-100">
            <div className="font-semibold mb-1 text-amber-950">Lý do bạn đã gửi:</div>
            <p className="whitespace-pre-line">{cancelRequestReason}</p>
          </div>
        ) : null}
      </div>
    );
  }

  // Nếu đơn đã hủy / đã giao / đang ship → không cho yêu cầu hủy
  if (!canRequestCancel(status)) {
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = reason.trim();
    if (trimmed.length < 5) {
      toast.error("Lý do hủy tối thiểu 5 ký tự");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/orders/${orderId}/request-cancel`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        credentials: "include",
        body: JSON.stringify({ reason: trimmed }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        const msg =
          (data && (data.error || data.message)) ||
          "Không thể gửi yêu cầu hủy đơn. Vui lòng thử lại.";
        throw new Error(msg);
      }

      toast.success("Đã gửi yêu cầu hủy đơn. Chúng tôi sẽ xử lý sớm.");
      // Có thể đơn sẽ chuyển sang trạng thái "cancel_requested" sau khi reload
      setReason("");
      // Tuỳ bạn: gọi window.location.reload() để sync trạng thái
      window.location.reload();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Có lỗi xảy ra.";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-2xl border border-rose-100 bg-rose-50/70 p-4 space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-rose-900">
        <AlertTriangle className="h-4 w-4" />
        Yêu cầu hủy đơn hàng
      </div>
      <p className="text-xs text-rose-800">
        Bạn chỉ có thể yêu cầu hủy khi đơn đang ở trạng thái{" "}
        <strong>chờ thanh toán / đã thanh toán / đang xử lý</strong>. Yêu cầu sẽ được
        nhân viên xem xét và xác nhận lại với bạn.
      </p>

      <form onSubmit={handleSubmit} className="space-y-2">
        <textarea
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="w-full rounded-xl border border-rose-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-rose-400 focus:border-rose-400 outline-none resize-none"
          placeholder="Nhập lý do hủy đơn: đặt nhầm sản phẩm, thay đổi nhu cầu, trùng đơn… (tối thiểu 5 ký tự)"
        />
        <div className="flex items-center justify-between gap-2 text-[11px] text-rose-700">
          <span>
            Lý do hủy sẽ được lưu lại và gửi cho bộ phận xử lý đơn hàng của AHSO.
          </span>
        </div>
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={submitting || reason.trim().length < 5}
            className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Gửi yêu cầu hủy đơn
          </button>
        </div>
      </form>
    </div>
  );
}
