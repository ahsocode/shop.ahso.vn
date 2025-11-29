"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, RefreshCw, Clock } from "lucide-react";
import type { OrderStatus } from "@/dto/order.dto";

type OrderRow = {
  id: string;
  code: string;
  customerName: string;
  status: OrderStatus;
  grandTotal: number;
  updatedAt: string;
};

type ApiResponse = {
  data: OrderRow[];
  meta: { total: number };
};

const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "Chờ thanh toán",
  paid: "Đã thanh toán",
  processing: "Đang xử lý",
  shipped: "Đã gửi hàng",
  delivered: "Đã giao",
  cancel_requested: "Yêu cầu hủy",
  cancelled: "Đã hủy",
};

function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  if (typeof window !== "undefined") {
    const token = window.localStorage.getItem("token");
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  useEffect(() => {
    let ignore = false;
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          page: String(page),
          pageSize: String(pageSize),
        });
        const res = await fetch(`/api/staff/orders?${params.toString()}`, {
          headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders(),
          },
          credentials: "include",
          cache: "no-store",
          signal: controller.signal,
        });
        if (!res.ok) {
          throw new Error("Không thể tải danh sách đơn hàng");
        }
        const data = (await res.json()) as ApiResponse;
        if (ignore) return;
        setOrders(data.data || []);
      } catch (err) {
        if (ignore) return;
        const msg = err instanceof Error ? err.message : "Đã xảy ra lỗi";
        setError(msg);
        setOrders([]);
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    load();
    return () => {
      ignore = true;
      controller.abort();
    };
  }, [page]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Đơn hàng</h1>
          <p className="text-sm text-slate-500">
            Xem log lịch sử và người thao tác. Chỉ đọc, không có hành động.
          </p>
        </div>
        <button
          onClick={() => setPage((p) => p)}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
        >
          <RefreshCw className="w-4 h-4" />
          Làm mới
        </button>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
        <div className="grid grid-cols-12 gap-3 px-4 py-3 text-xs font-semibold text-slate-500">
          <div className="col-span-3">Mã đơn</div>
          <div className="col-span-3">Khách hàng</div>
          <div className="col-span-2">Trạng thái</div>
          <div className="col-span-2 text-right">Tổng</div>
          <div className="col-span-2 text-right">Cập nhật</div>
        </div>
        <div className="divide-y divide-slate-100">
          {loading && (
            <div className="py-10 text-center text-slate-500">
              <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-slate-400" />
              Đang tải...
            </div>
          )}
          {error && !loading && (
            <div className="py-10 text-center text-rose-600 text-sm">{error}</div>
          )}
          {!loading && !error && orders.length === 0 && (
            <div className="py-10 text-center text-slate-500 text-sm">Chưa có đơn hàng.</div>
          )}
          {!loading &&
            !error &&
            orders.map((order) => (
              <div
                key={order.id}
                className="grid grid-cols-12 gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50"
              >
                <div className="col-span-3 flex items-center gap-2">
                  <Link
                    href={`/admin/orders/${order.id}/history`}
                    className="font-semibold text-blue-600 hover:underline"
                  >
                    {order.code}
                  </Link>
                </div>
                <div className="col-span-3 truncate">{order.customerName}</div>
                <div className="col-span-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                    {STATUS_LABEL[order.status]}
                  </span>
                </div>
                <div className="col-span-2 text-right">
                  {order.grandTotal?.toLocaleString("vi-VN")} ₫
                </div>
                <div className="col-span-2 text-right text-xs text-slate-500 flex items-center justify-end gap-1">
                  <Clock className="w-3 h-3" />
                  {new Date(order.updatedAt).toLocaleDateString("vi-VN")}
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
