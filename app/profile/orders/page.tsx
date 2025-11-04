"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Search, Eye, RefreshCcw, ChevronLeft, ChevronRight, ShieldCheck, LogIn } from "lucide-react";
import type { OrderListItemDTO } from "../../../dto/order.dto";

function formatVND(n: number) {
  return n.toLocaleString("vi-VN") + " ₫";
}

const STATUS_LABEL: Record<NonNullable<OrderListItemDTO["status"]>, string> = {
  pending: "Chờ thanh toán",
  paid: "Đã thanh toán",
  processing: "Đang xử lý",
  shipped: "Đã gửi hàng",
  delivered: "Đã giao",
  cancelled: "Đã hủy",
};

function StatusBadge({ status }: { status: OrderListItemDTO["status"] }) {
  const styles: Record<NonNullable<OrderListItemDTO["status"]>, string> = {
    pending: "bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200",
    paid: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
    processing: "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
    shipped: "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200",
    delivered: "bg-green-50 text-green-700 ring-green-200",
    cancelled: "bg-rose-50 text-rose-700 ring-rose-200",
  };
  if (!status) return null;
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${styles[status]}`}>
      {STATUS_LABEL[status]}
    </span>
  );
}

export default function CustomerOrdersPage() {
  const [orders, setOrders] = useState<OrderListItemDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [unauth, setUnauth] = useState(false);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    (async () => {
      setLoading(true);
      setUnauth(false);
      try {
        const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
        const r = await fetch("/api/profile/orders", {
          cache: "no-store",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (r.status === 401) {
          setUnauth(true);
          setOrders([]);
          return;
        }
        if (!r.ok) throw new Error("fetch_failed");
        const data = (await r.json()) as OrderListItemDTO[];
        setOrders(data);
      } catch {
        // fallback trống cho khách (không giả mock ở view khách)
        setOrders([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      if (!q.trim()) return true;
      const key = q.toLowerCase();
      return o.code.toLowerCase().includes(key) || o.customerName.toLowerCase().includes(key);
    });
  }, [orders, q]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageData = filtered.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    setPage(1);
  }, [q]);

  return (
    <div className="mx-auto max-w-7xl p-4 sm:p-6">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">Đơn hàng của tôi</h1>
          <ShieldCheck className="h-5 w-5 text-gray-400" />
        </div>
        <div className="text-sm text-gray-500">Chỉ hiển thị các đơn thuộc tài khoản của bạn</div>
      </div>

      {/* Thanh tìm kiếm */}
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="relative sm:col-span-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tìm theo mã đơn…"
            className="w-full rounded-xl border border-gray-200 bg-white px-9 py-2.5 text-sm outline-none ring-0 focus:border-blue-300"
          />
        </div>
        <button
          onClick={() => {
            setQ("");
            setPage(1);
          }}
          className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium hover:bg-gray-50"
        >
          <RefreshCcw className="mr-2 h-4 w-4" />
          Đặt lại
        </button>
      </div>

      {/* Trạng thái chưa đăng nhập */}
      {unauth && (
        <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Bạn chưa đăng nhập. Vui lòng{" "}
          <Link href="/login" className="font-medium underline">
            đăng nhập
          </Link>{" "}
          để xem đơn hàng của bạn.
        </div>
      )}

      {/* Bảng đơn hàng */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="hidden w-full grid-cols-12 gap-4 p-4 text-xs font-semibold text-gray-500 sm:grid">
          <div className="col-span-4">Mã đơn</div>
          <div className="col-span-3">Ngày tạo</div>
          <div className="col-span-3 text-right">Tổng tiền</div>
          <div className="col-span-2 text-right">Thao tác</div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-sm text-gray-500">Đang tải…</div>
        ) : pageData.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-500">
            {unauth ? (
              <div className="flex flex-col items-center gap-3">
                <LogIn className="h-5 w-5" />
                <span>Hãy đăng nhập để xem đơn hàng của bạn.</span>
                <Link
                  href="/login"
                  className="inline-flex items-center rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-700"
                >
                  Đăng nhập
                </Link>
              </div>
            ) : (
              "Bạn chưa có đơn hàng nào."
            )}
          </div>
        ) : (
          pageData.map((o) => (
            <div
              key={o.id}
              className="grid w-full grid-cols-1 gap-2 border-t border-gray-100 p-4 sm:grid-cols-12 sm:items-center sm:gap-4"
            >
              <div className="sm:col-span-4">
                <div className="font-medium text-gray-900">{o.code}</div>
                <div className="mt-0.5 text-xs text-gray-500">ID: {o.id}</div>
                {o.status ? (
                  <div className="mt-1">
                    <StatusBadge status={o.status} />
                  </div>
                ) : null}
              </div>
              <div className="sm:col-span-3 text-gray-700">
                {new Date(o.createdAt).toLocaleString("vi-VN")}
              </div>
              <div className="sm:col-span-3 text-right font-medium">{formatVND(o.total)}</div>
              <div className="sm:col-span-2 flex sm:justify-end">
                <Link
                  href={`/order/${o.id}`}
                  className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-700"
                >
                  <Eye className="h-4 w-4" />
                  Xem chi tiết
                </Link>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Phân trang */}
      <div className="mt-4 flex items-center justify-between text-sm">
        <div className="text-gray-500">
          Trang {page}/{totalPages} · {filtered.length} đơn
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="inline-flex items-center rounded-lg border border-gray-200 bg-white px-3 py-2 hover:bg-gray-50 disabled:opacity-50"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="inline-flex items-center rounded-lg border border-gray-200 bg-white px-3 py-2 hover:bg-gray-50 disabled:opacity-50"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
