"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { OrderStatus } from "@/dto/order.dto";

type Props = {
  orderId: string;
  status: OrderStatus;
};

type UpdateBody = {
  status: OrderStatus;
  cancelReason?: string;
};

// ====== TOAST CONFIRM ĐẾM NGƯỢC 5S ======

type ConfirmCountdownProps = {
  t: string | number;
  message: string;
  onResult: (ok: boolean) => void;
};

function ConfirmCountdownToast({ t, message, onResult }: ConfirmCountdownProps) {
  const [remain, setRemain] = useState(5);

  useEffect(() => {
    const timer = setInterval(() => {
      setRemain((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  function handleCancel() {
    toast.dismiss(t);
    onResult(false);
  }

  function handleConfirm() {
    if (remain > 0) return;
    toast.dismiss(t);
    onResult(true);
  }

  return (
    <div className="w-[340px] rounded-2xl border border-gray-200 bg-white p-4 shadow-xl">
      <div className="text-sm font-semibold text-gray-900">{message}</div>
      <div className="mt-1 text-xs text-gray-500">
        Vui lòng xác nhận thao tác này. Bạn có thể nhấn xác nhận sau{" "}
        <span className="font-semibold">{remain}s</span>.
      </div>
      <div className="mt-4 flex items-center justify-end gap-2 text-sm">
        <button
          type="button"
          onClick={handleCancel}
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-gray-600 hover:bg-gray-50"
        >
          Hủy
        </button>
        <button
          type="button"
          disabled={remain > 0}
          onClick={handleConfirm}
          className={`rounded-lg px-3 py-1.5 font-semibold text-white ${
            remain > 0 ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {remain > 0 ? `Đợi ${remain}s` : "Xác nhận"}
        </button>
      </div>
    </div>
  );
}

function confirmWithCountdown(message: string) {
  return new Promise<boolean>((resolve) => {
    toast.custom(
      (t) => <ConfirmCountdownToast t={t} message={message} onResult={resolve} />,
      { duration: Infinity },
    );
  });
}

// ====== LOGIC FLOW TRẠNG THÁI ======

function getNextLabel(status: OrderStatus): string | null {
  switch (status) {
    case "pending":
      return "✔ Xác nhận đã thanh toán";
    case "paid":
      return "🔧 Xử lý đơn hàng";
    case "processing":
      return "🚚 Đã gửi hàng cho đơn vị vận chuyển";
    case "shipped":
      return "📦 Giao hàng thành công";
    case "cancel_requested":
      return "❗ Duyệt yêu cầu hủy đơn";
    default:
      return null;
  }
}

function getNextStatus(status: OrderStatus): OrderStatus | null {
  switch (status) {
    case "pending":
      return "paid";
    case "paid":
      return "processing";
    case "processing":
      return "shipped";
    case "shipped":
      return "delivered";
    case "cancel_requested":
      return "cancelled";
    default:
      return null;
  }
}

// Cho phép hủy ở các trạng thái:
// chờ thanh toán, đã thanh toán, đang xử lý, đã gửi hàng
function canCancel(status: OrderStatus): boolean {
  return ["pending", "paid", "processing", "shipped"].includes(status);
}

// ====== COMPONENT CHÍNH ======

export default function OrderActions({ orderId, status }: Props) {
  const [loading, setLoading] = useState(false);

  const nextLabel = getNextLabel(status);
  const nextStatus = getNextStatus(status);
  const showCancel = canCancel(status);

  async function callUpdate(body: UpdateBody) {
    setLoading(true);
    try {
      const res = await fetch(`/api/staff/orders/${orderId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        const msg =
          data && typeof data === "object" && "error" in data && typeof data.error === "string"
            ? data.error
            : "Không thể cập nhật đơn hàng";
        throw new Error(msg);
      }

      toast.success("Đã cập nhật trạng thái đơn hàng");
      // Hard reload cho chắc vì nhiều nơi dùng cùng dữ liệu
      window.location.reload();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Không thể cập nhật đơn hàng";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleNextStatus() {
    if (!nextStatus) return;

    const ok = await confirmWithCountdown(
      `Bạn có chắc muốn chuyển đơn hàng sang trạng thái "${getNextLabel(status)}"?`,
    );
    if (!ok) return;

    await callUpdate({ status: nextStatus });
  }

  async function handleCancel() {
    if (!showCancel) return;

    const ok = await confirmWithCountdown("Bạn có chắc chắn muốn hủy đơn hàng này?");
    if (!ok) return;

    const reason = window.prompt("Vui lòng nhập lý do hủy đơn hàng:");
    if (!reason || reason.trim().length < 3) {
      toast.error("Lý do hủy cần ít nhất 3 ký tự");
      return;
    }

    await callUpdate({
      status: "cancelled",
      cancelReason: reason.trim(),
    });
  }

  if (!nextStatus && !showCancel) {
    // delivered / cancelled -> không hiển thị nút
    return null;
  }

  return (
    <div className="flex flex-col gap-2 items-stretch">
      {nextStatus && (
        <button
          type="button"
          disabled={loading}
          onClick={handleNextStatus}
          className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {nextLabel}
        </button>
      )}
      {showCancel && (
        <button
          type="button"
          disabled={loading}
          onClick={handleCancel}
          className="inline-flex items-center justify-center rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
        >
          ❌ Hủy đơn
        </button>
      )}
    </div>
  );
}
