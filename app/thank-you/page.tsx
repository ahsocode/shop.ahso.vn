// app/thank-you/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Home } from "lucide-react";

type OrderPreview = {
  code: string;
  customerFullName: string;
};

export default function ThankYouPage() {
  const router = useRouter();
  const [order] = useState<OrderPreview | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const raw = window.sessionStorage.getItem("orderPreview");
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return {
        code: parsed.code,
        customerFullName: parsed.customerFullName,
      };
    } catch {
      return null;
    }
  });

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-50 to-blue-50 flex items-center">
      <div className="mx-auto max-w-xl px-4 py-10">
        <div className="rounded-3xl bg-white p-8 shadow-md text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
            <CheckCircle2 className="h-8 w-8 text-green-600" />
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Cảm ơn bạn đã thanh toán!
          </h1>

          <p className="text-sm text-gray-700 mb-4">
            {order?.customerFullName && (
              <>
                {order.customerFullName},{" "}
              </>
            )}
            đơn hàng của bạn đã được ghi nhận và đang chờ xác nhận thanh toán từ ngân
            hàng.
          </p>

          {order?.code && (
            <p className="mb-4 text-sm text-gray-700">
              Mã đơn hàng của bạn là{" "}
              <span className="font-mono font-semibold">{order.code}</span>.
            </p>
          )}

          <p className="text-xs text-gray-500 mb-6">
            Đội ngũ AHSO sẽ kiểm tra giao dịch và cập nhật trạng thái đơn hàng trong
            khoảng <b>1–2 giờ</b> làm việc. Nếu có bất kỳ vấn đề nào, chúng tôi sẽ liên
            hệ qua email/số điện thoại bạn đã cung cấp.
          </p>

          <button
            onClick={() => router.push("/")}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
          >
            <Home className="h-5 w-5" />
            Về trang chủ
          </button>
        </div>
      </div>
    </div>
  );
}
