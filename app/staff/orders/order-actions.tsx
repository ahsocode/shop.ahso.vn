"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { OrderStatus } from "@/dto/order.dto";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  orderId: string;
  status: OrderStatus;
};

type UpdateBody = {
  status: OrderStatus;
  cancelReason?: string;
  rejectCancel?: boolean;
  rejectCancelReason?: string;
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
      return "❗ Chấp nhận yêu cầu hủy đơn";
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
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [rejectReason, setRejectReason] = useState("");

  const nextLabel = getNextLabel(status);
  const nextStatus = getNextStatus(status);
  const showCancel = canCancel(status);
  const isCancelRequested = status === "cancel_requested";

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
    setCancelModalOpen(true);
  }

  async function handleRejectCancel() {
    if (!isCancelRequested) return;
    setRejectModalOpen(true);
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
      {isCancelRequested && (
        <button
          type="button"
          disabled={loading}
          onClick={handleRejectCancel}
          className="inline-flex items-center justify-center rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-600 disabled:opacity-60"
        >
          🚫 Từ chối yêu cầu hủy
        </button>
      )}

      <Dialog open={cancelModalOpen} onOpenChange={setCancelModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hủy đơn hàng</DialogTitle>
            <DialogDescription>
              Nhập lý do hủy đơn (tối thiểu 3 ký tự). Khách sẽ nhận email thông báo nếu cần.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            rows={3}
            placeholder="Lý do hủy đơn"
          />
          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setCancelModalOpen(false);
                setCancelReason("");
              }}
            >
              Đóng
            </Button>
            <Button
              disabled={loading || cancelReason.trim().length < 3}
              onClick={async () => {
                if (cancelReason.trim().length < 3) {
                  toast.error("Lý do hủy cần ít nhất 3 ký tự");
                  return;
                }
                await callUpdate({
                  status: "cancelled",
                  cancelReason: cancelReason.trim(),
                });
                setCancelModalOpen(false);
                setCancelReason("");
              }}
            >
              Xác nhận hủy
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={rejectModalOpen} onOpenChange={setRejectModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Từ chối yêu cầu hủy</DialogTitle>
            <DialogDescription>
              Nhập lý do từ chối (tối thiểu 5 ký tự). Đơn sẽ trở về trạng thái trước khi khách yêu cầu hủy.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={3}
            placeholder="Lý do từ chối yêu cầu hủy"
          />
          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setRejectModalOpen(false);
                setRejectReason("");
              }}
            >
              Đóng
            </Button>
            <Button
                disabled={loading || rejectReason.trim().length < 5}
                onClick={async () => {
                  if (rejectReason.trim().length < 5) {
                    toast.error("Lý do cần tối thiểu 5 ký tự");
                    return;
                  }

                  await callUpdate({
                    status,
                    rejectCancel: true,
                    rejectCancelReason: rejectReason.trim(),
                  });

                  setRejectModalOpen(false);
                  setRejectReason("");
                }}
              >
                Xác nhận từ chối
              </Button>

          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
