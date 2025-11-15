// app/checkout/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { CheckCircle2, QrCode, ArrowLeft } from "lucide-react";

type OrderPreview = {
  id: string;
  code: string;
  status: string;
  customerFullName: string;
  grandTotal: number;
  vat: number;
  shippingFee: number;
  discount: number;
  subtotal: number;
  bankInfo: {
    bankId: string;        // "tpbank"
    accountName: string;
    accountNumber: string;
    bankName: string;
    transferNote: string;  // mã đơn hàng
  };
};

const formatVND = (n: number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Math.max(0, Math.round(n)));

export default function CheckoutPage() {
  const router = useRouter();
  const [order] = useState<OrderPreview | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const raw = window.sessionStorage.getItem("orderPreview");
      return raw ? (JSON.parse(raw) as OrderPreview) : null;
    } catch {
      return null;
    }
  });

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md rounded-2xl bg-white p-6 shadow">
          <p className="text-sm text-gray-700">
            Không tìm thấy thông tin đơn hàng. Vui lòng quay lại giỏ hàng và thử lại.
          </p>
          <button
            className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
            onClick={() => router.push("/cart")}
          >
            Quay lại giỏ hàng
          </button>
        </div>
      </div>
    );
  }

  const amount = Math.round(order.grandTotal);
  const { bankId, accountNumber, accountName, transferNote } = order.bankInfo;

  // VietQR quick link: https://img.vietqr.io/image/<BANK_ID>-<ACCOUNT_NO>-<TEMPLATE>.png?amount=...&addInfo=...&accountName=...
  const qrUrl = `https://img.vietqr.io/image/${bankId}-${accountNumber}-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(
    transferNote,
  )}&accountName=${encodeURIComponent(accountName)}`;

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-50 to-blue-50">
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-blue-600 p-3">
              <QrCode className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                Thanh toán đơn hàng
              </h1>
              <p className="text-sm text-gray-600">
                Quét mã QR để thanh toán. Mã đơn hàng:{" "}
                <span className="font-semibold">{order.code}</span>
              </p>
            </div>
          </div>
          <button
            onClick={() => router.push("/cart")}
            className="hidden sm:flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm font-medium hover:bg-gray-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Quay lại giỏ hàng
          </button>
        </div>

        <div className="grid gap-6 md:grid-cols-[2fr,1.4fr]">
          {/* QR side */}
          <div className="rounded-2xl border bg-white p-4 sm:p-6 shadow-sm flex flex-col items-center">
            <h2 className="mb-3 text-lg font-semibold text-gray-900">
              Quét mã VietQR để thanh toán
            </h2>
            <p className="mb-4 text-sm text-gray-600 text-center">
              Sử dụng ứng dụng ngân hàng / ví điện tử hỗ trợ VietQR để quét mã.
              Nội dung chuyển khoản đã được điền sẵn là mã đơn hàng{" "}
              <span className="font-semibold">{order.code}</span>.
            </p>

            <div className="rounded-2xl border bg-gray-50 p-4">
              <Image
                src={qrUrl}
                alt="Mã QR thanh toán VietQR"
                width={256}
                height={256}
                sizes="256px"
                className="h-64 w-64 object-contain"
                priority
              />
            </div>

            <button
              onClick={() => router.push("/thank-you")}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-green-600 px-5 py-3 text-sm font-semibold text-white hover:bg-green-700"
            >
              <CheckCircle2 className="h-5 w-5" />
              Tôi đã hoàn tất thanh toán
            </button>

            <p className="mt-3 text-xs text-gray-500 text-center">
              Sau khi chuyển khoản, đơn hàng sẽ được đội ngũ AHSO kiểm tra và xác nhận
              trong khoảng 1–2 giờ làm việc.
            </p>
          </div>

          {/* Summary side */}
          <div className="rounded-2xl border bg-white p-4 sm:p-6 shadow-sm space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Thông tin thanh toán
            </h2>

            <div className="space-y-1 text-sm">
              <p>
                <span className="text-gray-600">Khách hàng: </span>
                <span className="font-medium">{order.customerFullName}</span>
              </p>
              <p>
                <span className="text-gray-600">Mã đơn hàng: </span>
                <span className="font-mono font-semibold">{order.code}</span>
              </p>
            </div>

            <div className="mt-2 space-y-2 rounded-xl bg-gray-50 p-4 text-sm">
              <p className="font-semibold text-gray-900">Thông tin tài khoản:</p>
              <p>
                <span className="text-gray-600">Ngân hàng: </span>
                {order.bankInfo.bankName}
              </p>
              <p>
                <span className="text-gray-600">Số tài khoản: </span>
                <span className="font-mono font-semibold">
                  {order.bankInfo.accountNumber}
                </span>
              </p>
              <p>
                <span className="text-gray-600">Tên tài khoản: </span>
                {order.bankInfo.accountName}
              </p>
              <p>
                <span className="text-gray-600">Nội dung chuyển khoản: </span>
                <span className="font-mono">{order.bankInfo.transferNote}</span>
              </p>
            </div>

            <div className="mt-2 space-y-2 rounded-xl bg-blue-50 p-4 text-sm">
              <p className="font-semibold text-gray-900">Tóm tắt số tiền</p>
              <div className="flex justify-between">
                <span className="text-gray-600">Tạm tính</span>
                <span className="font-medium">{formatVND(order.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Giảm giá</span>
                <span className="font-medium">
                  -{formatVND(order.discount)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">VAT (10%)</span>
                <span className="font-medium">{formatVND(order.vat)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Phí vận chuyển</span>
                <span className="font-medium">
                  {formatVND(order.shippingFee)}
                </span>
              </div>
              <div className="flex justify-between border-t pt-2 text-base">
                <span className="font-semibold text-gray-900">Tổng thanh toán</span>
                <span className="text-lg font-bold text-blue-600">
                  {formatVND(order.grandTotal)}
                </span>
              </div>
            </div>

            <p className="text-xs text-gray-500">
              * Đơn hàng sẽ chỉ được xử lý sau khi AHSO xác nhận đã nhận đủ số tiền
              thanh toán tương ứng.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
