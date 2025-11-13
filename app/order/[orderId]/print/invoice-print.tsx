"use client";

import { useEffect } from "react";
import Link from "next/link";
import type { OrderDetailDTO } from "@/dto/order.dto";

function formatVND(n: number) {
  return (n || 0).toLocaleString("vi-VN") + " ₫";
}

export default function InvoicePrint({
  order,
}: {
  order: OrderDetailDTO;
}) {
  // Auto print khi mở trang
  useEffect(() => {
    const t = setTimeout(() => {
      window.print();
    }, 400);
    return () => clearTimeout(t);
  }, []);

  const { pricing, items, customer, shippingAddress } = order;

  return (
    <div className="min-h-screen bg-white p-6 print:p-4 print:bg-white">
      {/* ====== HEADER CHỈ HIỆN KHI KHÔNG Ở CHẾ ĐỘ PRINT ====== */}
      <div className="mb-4 flex items-center justify-between print:hidden">
        <h1 className="text-xl font-semibold">Hóa đơn #{order.code}</h1>

        <div className="flex items-center gap-2">
          {/* 🔙 Quay lại trang chi tiết đơn */}
          <Link
            href={`/order/${order.id}`}
            className="rounded-md border px-3 py-1 text-sm hover:bg-gray-50"
          >
            Quay lại
          </Link>

          {/* 🖨️ In lại nếu người dùng đã đóng dialog print */}
          <button
            onClick={() => window.print()}
            className="rounded-md border px-3 py-1 text-sm hover:bg-gray-50"
          >
            In lại
          </button>
        </div>
      </div>

      {/* ====== NỘI DUNG A4 ====== */}
      <div className="mx-auto max-w-[800px] rounded-lg border border-gray-200 p-6 text-sm leading-relaxed">
        {/* Header công ty */}
        <div className="flex justify-between gap-4 border-b pb-4">
          <div>
            <div className="text-lg font-semibold">CÔNG TY TNHH AHSO</div>
            <div>Số TK: 03168969399</div>
            <div>Ngân hàng TPBank – CN Bình Chánh</div>
          </div>
          <div className="text-right">
            <div className="font-semibold">Mã đơn: {order.code}</div>
            <div>
              Ngày tạo:{" "}
              {new Date(order.createdAt).toLocaleString("vi-VN")}
            </div>
          </div>
        </div>

        {/* Thông tin KH */}
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div>
            <div className="font-semibold">Khách hàng</div>
            <div>{customer.name}</div>
          </div>

          <div>
            <div className="font-semibold">Địa chỉ giao hàng</div>
            {shippingAddress ? (
              <>
                <div>{shippingAddress.line1}</div>
                {shippingAddress.line2 && <div>{shippingAddress.line2}</div>}
                <div>
                  {shippingAddress.district
                    ? `${shippingAddress.district}, `
                    : ""}
                  {shippingAddress.city}
                  {shippingAddress.province
                    ? `, ${shippingAddress.province}`
                    : ""}
                </div>
              </>
            ) : (
              <div>—</div>
            )}
          </div>
        </div>

        {/* Bảng sản phẩm */}
        <table className="mt-6 w-full border-collapse text-xs">
          <thead>
            <tr className="border-b border-gray-300">
              <th className="py-2 text-left">Sản phẩm</th>
              <th className="py-2 text-left">SKU</th>
              <th className="py-2 text-center">SL</th>
              <th className="py-2 text-right">Đơn giá</th>
              <th className="py-2 text-right">Thành tiền</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => {
              const lineTotal = it.qty * it.price;
              return (
                <tr key={it.sku} className="border-b border-gray-100">
                  <td className="py-2 pr-2">{it.name}</td>
                  <td className="py-2 pr-2">{it.sku}</td>
                  <td className="py-2 text-center">{it.qty}</td>
                  <td className="py-2 text-right">{formatVND(it.price)}</td>
                  <td className="py-2 text-right">{formatVND(lineTotal)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Tổng tiền */}
        <div className="mt-4 flex justify-end">
          <div className="w-full max-w-xs space-y-1">
            <div className="flex justify-between">
              <span>Tạm tính</span>
              <span>{formatVND(pricing.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>Giảm giá</span>
              <span>-{formatVND(pricing.discountTotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>VAT (10%)</span>
              <span>{formatVND(pricing.taxTotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>Phí vận chuyển</span>
              <span>{formatVND(pricing.shippingFee)}</span>
            </div>
            <div className="mt-2 flex justify-between border-t pt-2 text-base font-semibold">
              <span>Tổng cộng</span>
              <span>{formatVND(pricing.grandTotal)}</span>
            </div>
          </div>
        </div>

        {/* Chú thích */}
        <div className="mt-6 text-xs text-gray-500">
          Hóa đơn được tạo từ hệ thống AHSO Industrial.  
          Vui lòng giữ lại để đối chiếu khi cần.
        </div>
      </div>
    </div>
  );
}
