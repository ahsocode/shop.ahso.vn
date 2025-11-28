"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Search,
  Filter,
  Eye,
  RefreshCcw,
  ChevronLeft,
  ChevronRight,
  ShoppingBag,
  Calendar,
  User,
  Loader2,
  Package,
  AlertCircle,
} from "lucide-react";
import type { OrderListItemDTO } from "../../dto/order.dto";

function formatVND(n: number) {
  const num = typeof n === "number" ? n : Number(n || 0);
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(num);
}

type OrderStatusValue = NonNullable<OrderListItemDTO["status"]>;

const STATUS_LABEL: Record<OrderStatusValue, string> = {
  pending: "Chờ thanh toán",
  paid: "Đã thanh toán",
  processing: "Đang xử lý",
  shipped: "Đã gửi hàng",
  delivered: "Đã giao",
  cancel_requested: "Yêu cầu hủy",
  cancelled: "Đã hủy",
};

const isValidStatus = (value: string): value is OrderStatusValue =>
  Object.prototype.hasOwnProperty.call(STATUS_LABEL, value);

function StatusBadge({ status }: { status: OrderListItemDTO["status"] }) {
  if (!status) return null;

  const styles: Record<OrderStatusValue, string> = {
    pending: "bg-gradient-to-r from-amber-50 to-amber-100 text-amber-800 ring-1 ring-amber-300/50",
    paid: "bg-gradient-to-r from-emerald-50 to-emerald-100 text-emerald-800 ring-1 ring-emerald-300/50",
    processing: "bg-gradient-to-r from-blue-50 to-blue-100 text-blue-800 ring-1 ring-blue-300/50",
    shipped: "bg-gradient-to-r from-indigo-50 to-indigo-100 text-indigo-800 ring-1 ring-indigo-300/50",
    delivered: "bg-gradient-to-r from-green-50 to-green-100 text-green-800 ring-1 ring-green-300/50",
    cancel_requested: "bg-gradient-to-r from-orange-50 to-orange-100 text-orange-800 ring-1 ring-orange-300/50",
    cancelled: "bg-gradient-to-r from-rose-50 to-rose-100 text-rose-800 ring-1 ring-rose-300/50",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${styles[status]}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
      {STATUS_LABEL[status]}
    </span>
  );
}

type OrderListResponse = {
  items: OrderListItemDTO[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
};

export default function OrderListPage() {
  const [orders, setOrders] = useState<OrderListItemDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"" | OrderStatusValue>("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const handleStatusChange = (value: string) => {
    if (!value) {
      setStatus("");
      return;
    }
    if (isValidStatus(value)) {
      setStatus(value);
    }
  };

  useEffect(() => {
    setPage(1);
  }, [q, status]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        params.set("page", String(page));
        params.set("pageSize", String(pageSize));
        if (q.trim()) params.set("q", q.trim());
        if (status) params.set("status", status);

        const r = await fetch(`/api/orders?${params.toString()}`, {
          cache: "no-store",
          credentials: "include",
        });

        if (!r.ok) {
          throw new Error(`Failed to fetch orders: ${r.status}`);
        }

        const data = (await r.json()) as OrderListResponse | OrderListItemDTO[];

        if (cancelled) return;

        if (Array.isArray(data)) {
          setOrders(data);
          setTotalItems(data.length);
          setTotalPages(Math.max(1, Math.ceil(data.length / pageSize)));
        } else {
          setOrders(data.items);
          setTotalItems(data.totalItems);
          setTotalPages(Math.max(1, data.totalPages || 1));
        }
      } catch (err: unknown) {
        if (cancelled) return;
        setError("Không thể tải danh sách đơn hàng.");
        setOrders([]);
        setTotalItems(0);
        setTotalPages(1);
        console.error("Fetch orders error:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [q, status, page, pageSize]);

  const hasData = orders.length > 0;

  const pageData = useMemo(() => {
    if (totalItems > orders.length) return orders;
    const start = (page - 1) * pageSize;
    return orders.slice(start, start + pageSize);
  }, [orders, page, pageSize, totalItems]);

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 via-slate-50 to-slate-100">
      <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-xs text-slate-500 uppercase tracking-[0.2em] font-bold mb-3">
            <ShoppingBag className="w-3.5 h-3.5" />
            Quản lý mua hàng
          </div>
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Đơn hàng của tôi</h1>
              <p className="text-sm text-slate-600 mt-1">
                Theo dõi trạng thái và lịch sử đơn hàng của bạn
              </p>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-linear-to-r from-blue-50 to-blue-100 border-2 border-blue-200">
              <Package className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-bold text-blue-900">{totalItems} đơn hàng</span>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl border-2 border-slate-200 p-4 lg:p-6 shadow-sm mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="sm:col-span-2 lg:col-span-1">
              <label className="text-xs font-bold text-slate-700 mb-2 block">Tìm kiếm</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Mã đơn, tên khách hàng..."
                  className="w-full rounded-xl border-2 border-slate-200 bg-slate-50 px-10 py-2.5 text-sm outline-none focus:border-blue-400 focus:bg-white transition-all"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 mb-2 block">Trạng thái</label>
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                <select
                  value={status}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  className="w-full appearance-none rounded-xl border-2 border-slate-200 bg-slate-50 px-10 py-2.5 text-sm outline-none focus:border-blue-400 focus:bg-white transition-all"
                >
                  <option value="">Tất cả trạng thái</option>
                  <option value="pending">Chờ thanh toán</option>
                  <option value="paid">Đã thanh toán</option>
                  <option value="processing">Đang xử lý</option>
                  <option value="shipped">Đã gửi hàng</option>
                  <option value="delivered">Đã giao</option>
                  <option value="cancel_requested">Yêu cầu hủy</option>
                  <option value="cancelled">Đã hủy</option>
                </select>
              </div>
            </div>

            <div className="flex items-end">
              <button
                onClick={() => {
                  setQ("");
                  setStatus("");
                  setPage(1);
                }}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl border-2 border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all"
              >
                <RefreshCcw className="h-4 w-4" />
                Đặt lại bộ lọc
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="rounded-2xl border-2 border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="p-16 flex flex-col items-center justify-center gap-3 text-slate-500">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
              <p className="text-sm font-medium">Đang tải danh sách đơn hàng...</p>
            </div>
          </div>
        ) : error ? (
          <div className="rounded-2xl border-2 border-rose-200 bg-white shadow-sm overflow-hidden">
            <div className="p-12 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-rose-100 text-rose-600 mb-4">
                <AlertCircle className="w-8 h-8" />
              </div>
              <p className="text-sm font-semibold text-rose-600">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-rose-50 px-4 py-2 text-sm font-bold text-rose-700 hover:bg-rose-100 transition-all"
              >
                <RefreshCcw className="w-4 h-4" />
                Thử lại
              </button>
            </div>
          </div>
        ) : !hasData ? (
          <div className="rounded-2xl border-2 border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="p-12 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 text-slate-400 mb-4">
                <ShoppingBag className="w-8 h-8" />
              </div>
              <p className="text-sm font-semibold text-slate-700">Không tìm thấy đơn hàng</p>
              <p className="text-xs text-slate-500 mt-1">Thử điều chỉnh bộ lọc hoặc tạo đơn hàng mới</p>
            </div>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden lg:block rounded-2xl border-2 border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-linear-to-r from-slate-50 to-slate-100 border-b-2 border-slate-200">
                      <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
                        Mã đơn
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
                        Ngày tạo
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
                        Khách hàng
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-bold text-slate-600 uppercase tracking-wider">
                        Tổng tiền
                      </th>
                      <th className="px-6 py-4 text-center text-xs font-bold text-slate-600 uppercase tracking-wider">
                        Trạng thái
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-bold text-slate-600 uppercase tracking-wider">
                        Thao tác
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pageData.map((o) => (
                      <tr
                        key={o.id}
                        className="hover:bg-slate-50/50 transition-colors"
                      >
                        <td className="px-6 py-5">
                          <div>
                            <p className="font-bold text-slate-900 text-sm">{o.code}</p>
                            <p className="text-xs text-slate-500 font-mono mt-0.5">#{o.id.slice(0, 8)}</p>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-2 text-sm text-slate-700">
                            <Calendar className="w-4 h-4 text-slate-400" />
                            {o.createdAt
                              ? new Date(o.createdAt).toLocaleDateString("vi-VN", {
                                  day: "2-digit",
                                  month: "2-digit",
                                  year: "numeric",
                                })
                              : "-"}
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-linear-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-xs">
                              {o.customerName?.charAt(0) || "?"}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900 text-sm">{o.customerName}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5 text-right">
                          <p className="font-bold text-slate-900">{formatVND(o.total)}</p>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex justify-center">
                            {o.status ? <StatusBadge status={o.status} /> : null}
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex justify-end">
                            <Link
                              href={`/order/${o.id}`}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 text-white text-xs font-bold px-3 py-2 hover:bg-slate-800 transition-all hover:shadow-lg"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              Chi tiết
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile Cards */}
            <div className="lg:hidden space-y-4">
              {pageData.map((o) => (
                <div
                  key={o.id}
                  className="rounded-2xl border-2 border-slate-200 bg-white shadow-sm hover:shadow-md transition-all overflow-hidden"
                >
                  <div className="bg-linear-to-r from-slate-50 to-slate-100 px-4 py-3 border-b-2 border-slate-200">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs text-slate-600 font-semibold mb-1">Mã đơn</p>
                        <p className="text-base font-bold text-slate-900">{o.code}</p>
                        <p className="text-[10px] text-slate-500 font-mono mt-0.5">#{o.id.slice(0, 8)}</p>
                      </div>
                      {o.status ? <StatusBadge status={o.status} /> : null}
                    </div>
                  </div>

                  <div className="p-4 space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      <span className="text-slate-700">
                        {o.createdAt
                          ? new Date(o.createdAt).toLocaleDateString("vi-VN", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                            })
                          : "-"}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-sm">
                      <User className="w-4 h-4 text-slate-400" />
                      <span className="font-semibold text-slate-900">{o.customerName}</span>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                      <div>
                        <p className="text-xs text-slate-600 font-semibold mb-1">Tổng tiền</p>
                        <p className="text-lg font-bold text-slate-900">{formatVND(o.total)}</p>
                      </div>
                      <Link
                        href={`/order/${o.id}`}
                        className="inline-flex items-center gap-2 rounded-xl bg-slate-900 text-white text-sm font-bold px-4 py-2.5 hover:bg-slate-800 transition-all"
                      >
                        <Eye className="h-4 w-4" />
                        Chi tiết
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Pagination */}
        {hasData && !loading && !error && (
          <div className="mt-6 bg-white rounded-2xl border-2 border-slate-200 p-4 shadow-sm flex items-center justify-between">
            <div className="text-sm text-slate-600">
              Trang <span className="font-bold text-slate-900">{page}</span> / {Math.max(1, totalPages)} 
              <span className="hidden sm:inline"> · {totalItems} đơn hàng</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="inline-flex items-center gap-2 rounded-xl border-2 border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Trước</span>
              </button>
              <button
                onClick={() => setPage((p) => Math.min(Math.max(1, totalPages), p + 1))}
                disabled={page >= Math.max(1, totalPages)}
                className="inline-flex items-center gap-2 rounded-xl border-2 border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <span className="hidden sm:inline">Sau</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
