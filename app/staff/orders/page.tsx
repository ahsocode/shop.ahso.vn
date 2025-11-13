"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Search,
  Filter,
  Calendar,
  RefreshCcw,
  Eye,
  ChevronLeft,
  ChevronRight,
  Loader2,
  BadgeCheck,
  Clock3,
  Settings2,
  Truck,
  CheckCircle2,
  XCircle,
  Phone,
  Mail,
} from "lucide-react";
import { toast } from "sonner";

type OrderStatus = "pending" | "paid" | "processing" | "shipped" | "delivered" | "cancelled";
type PaymentStatus = "pending" | "awaiting_confirmation" | "confirmed" | "failed";

type StaffOrder = {
  id: string;
  code: string;
  createdAt: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus | null;
  paymentMethod: string | null;
  total: number;
};

type ApiResponse = {
  data: StaffOrder[];
  meta: { page: number; pageSize: number; total: number };
  stats: Record<OrderStatus, number>;
};

const formatter = new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" });

type StatusMeta = {
  label: string;
  hint: string;
  badge: string;
  cardBg: string;
  cardBorder: string;
  cardText: string;
  iconBg: string;
  accent: string;
  rowBg: string;
  mobileBorder: string;
  icon: React.ComponentType<{ className?: string }>;
};

const ORDER_STATUS_META: Record<OrderStatus, StatusMeta> = {
  pending: {
    label: "Chờ thanh toán",
    hint: "Khách chưa hoàn tất chuyển khoản",
    badge: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
    cardBg: "bg-amber-50",
    cardBorder: "border-amber-100",
    cardText: "text-amber-900",
    iconBg: "bg-amber-100 text-amber-700",
    accent: "border-amber-300",
    rowBg: "bg-amber-50/40",
    mobileBorder: "border-amber-200",
    icon: Clock3,
  },
  paid: {
    label: "Đã thanh toán",
    hint: "Đã nhận đủ tiền",
    badge: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
    cardBg: "bg-emerald-50",
    cardBorder: "border-emerald-100",
    cardText: "text-emerald-900",
    iconBg: "bg-emerald-100 text-emerald-700",
    accent: "border-emerald-300",
    rowBg: "bg-emerald-50/40",
    mobileBorder: "border-emerald-200",
    icon: BadgeCheck,
  },
  processing: {
    label: "Đang xử lý",
    hint: "Đang chuẩn bị hàng",
    badge: "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
    cardBg: "bg-blue-50",
    cardBorder: "border-blue-100",
    cardText: "text-blue-900",
    iconBg: "bg-blue-100 text-blue-700",
    accent: "border-blue-300",
    rowBg: "bg-blue-50/40",
    mobileBorder: "border-blue-200",
    icon: Settings2,
  },
  shipped: {
    label: "Đã gửi hàng",
    hint: "Chờ đơn vị vận chuyển",
    badge: "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200",
    cardBg: "bg-indigo-50",
    cardBorder: "border-indigo-100",
    cardText: "text-indigo-900",
    iconBg: "bg-indigo-100 text-indigo-700",
    accent: "border-indigo-300",
    rowBg: "bg-indigo-50/40",
    mobileBorder: "border-indigo-200",
    icon: Truck,
  },
  delivered: {
    label: "Đã giao",
    hint: "Hoàn tất giao hàng",
    badge: "bg-green-50 text-green-700 ring-1 ring-green-200",
    cardBg: "bg-green-50",
    cardBorder: "border-green-100",
    cardText: "text-green-900",
    iconBg: "bg-green-100 text-green-700",
    accent: "border-green-300",
    rowBg: "bg-green-50/40",
    mobileBorder: "border-green-200",
    icon: CheckCircle2,
  },
  cancelled: {
    label: "Đã hủy",
    hint: "Khách hoặc hệ thống hủy",
    badge: "bg-rose-50 text-rose-700 ring-1 ring-rose-200",
    cardBg: "bg-rose-50",
    cardBorder: "border-rose-100",
    cardText: "text-rose-900",
    iconBg: "bg-rose-100 text-rose-700",
    accent: "border-rose-300",
    rowBg: "bg-rose-50/40",
    mobileBorder: "border-rose-200",
    icon: XCircle,
  },
};

const PAYMENT_STATUS_META: Record<PaymentStatus, { label: string; chip: string }> = {
  pending: { label: "Chưa thanh toán", chip: "bg-slate-100 text-slate-700" },
  awaiting_confirmation: { label: "Chờ xác nhận", chip: "bg-amber-100 text-amber-800" },
  confirmed: { label: "Đã xác nhận", chip: "bg-emerald-100 text-emerald-800" },
  failed: { label: "Thanh toán lỗi", chip: "bg-rose-100 text-rose-700" },
};

function formatDate(value: string) {
  try {
    return new Date(value).toLocaleString("vi-VN");
  } catch {
    return value;
  }
}

function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  if (typeof window !== "undefined") {
    const token = window.localStorage.getItem("token");
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

export default function StaffOrdersPage() {
  const [orders, setOrders] = useState<StaffOrder[]>([]);
  const [stats, setStats] = useState<Record<OrderStatus, number>>({
    pending: 0,
    paid: 0,
    processing: 0,
    shipped: 0,
    delivered: 0,
    cancelled: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"" | OrderStatus>("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 15;
  const [totalItems, setTotalItems] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);

  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    setPage(1);
  }, [q, status, dateFrom, dateTo]);

  useEffect(() => {
    let ignore = false;
    const controller = new AbortController();

    async function loadOrders() {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          page: String(page),
          pageSize: String(pageSize),
        });
        if (q.trim()) params.set("q", q.trim());
        if (status) params.set("status", status);
        if (dateFrom) params.set("from", dateFrom);
        if (dateTo) params.set("to", dateTo);

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
        setOrders(data.data);
        setStats(data.stats);
        setTotalItems(data.meta.total);
      } catch (err: any) {
        if (ignore) return;
        if (err.name === "AbortError") return;
        setError(err.message || "Đã xảy ra lỗi");
        setOrders([]);
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    loadOrders();
    return () => {
      ignore = true;
      controller.abort();
    };
  }, [q, status, dateFrom, dateTo, page, refreshKey]);

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  const hasData = orders.length > 0;

  const summaryCards = useMemo(() => {
    return (Object.keys(ORDER_STATUS_META) as OrderStatus[]).map((s) => {
      const meta = ORDER_STATUS_META[s];
      return { status: s, count: stats[s] || 0, ...meta };
    });
  }, [stats]);

  async function handleQuickUpdate(orderId: string, nextStatus: OrderStatus) {
    if (!orderId) return;
    setUpdatingId(orderId);
    try {
      const res = await fetch(`/api/staff/orders/${orderId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        credentials: "include",
        body: JSON.stringify({ status: nextStatus }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Không thể cập nhật trạng thái");
      }

      toast.success("Đã cập nhật trạng thái đơn hàng");
      setRefreshKey((key) => key + 1);
    } catch (err: any) {
      toast.error(err.message || "Không thể cập nhật trạng thái");
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <p className="text-sm text-slate-500 uppercase tracking-[0.2em]">Theo dõi & vận hành</p>
        <h1 className="text-2xl font-semibold text-slate-900">Đơn hàng</h1>
        <p className="text-sm text-slate-500">
          Quản lý toàn bộ lifecycle đơn hàng của khách với số liệu cập nhật theo thời gian thực.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3 md:grid-cols-2">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.status}
              className={`rounded-2xl border ${card.cardBorder} ${card.cardBg} ${card.cardText} p-4 flex flex-col gap-1 shadow-sm`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wide text-black/40">{card.hint}</p>
                  <p className="text-lg font-semibold">{card.label}</p>
                </div>
                <div className={`p-2 rounded-xl shadow-inner ${card.iconBg}`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
              <p className="text-3xl font-bold">{card.count}</p>
            </div>
          );
        })}
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="md:col-span-2">
          <label className="text-xs font-semibold text-slate-500">Tìm kiếm</label>
          <div className="relative mt-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Mã đơn, tên khách, email, số điện thoại…"
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm focus:border-blue-400 outline-none"
            />
          </div>
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500">Trạng thái</label>
          <div className="relative mt-1">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as OrderStatus | "")}
              className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm focus:border-blue-400 outline-none"
            >
              <option value="">Tất cả trạng thái</option>
              {(Object.keys(ORDER_STATUS_META) as OrderStatus[]).map((s) => (
                <option key={s} value={s}>
                  {ORDER_STATUS_META[s].label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex gap-2">
          <div className="w-1/2">
            <label className="text-xs font-semibold text-slate-500">Từ ngày</label>
            <div className="relative mt-1">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm focus:border-blue-400 outline-none"
              />
            </div>
          </div>
          <div className="w-1/2">
            <label className="text-xs font-semibold text-slate-500">Đến ngày</label>
            <div className="relative mt-1">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm focus:border-blue-400 outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-slate-500">
          {totalItems} đơn · Trang {page} / {totalPages}
        </div>
        <button
          onClick={() => {
            setQ("");
            setStatus("");
            setDateFrom("");
            setDateTo("");
            setPage(1);
          }}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          <RefreshCcw className="w-4 h-4" />
          Đặt lại lọc
        </button>
      </div>

      {loading || error || !hasData ? (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-10 flex items-center justify-center gap-2 text-slate-500">
              <Loader2 className="w-5 h-5 animate-spin" />
              Đang tải dữ liệu…
            </div>
          ) : error ? (
            <div className="p-8 text-center text-sm text-rose-600">{error}</div>
          ) : (
            <div className="p-8 text-center text-sm text-slate-500">
              Không có đơn hàng nào phù hợp bộ lọc.
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="hidden lg:block rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="grid grid-cols-12 gap-4 px-6 py-4 text-xs font-semibold text-slate-500 border-b border-slate-100 bg-slate-50/80">
              <div className="col-span-2">Mã đơn</div>
              <div className="col-span-3">Khách hàng</div>
              <div className="col-span-2">Liên hệ</div>
              <div className="col-span-1 text-right">Tổng tiền</div>
              <div className="col-span-2">Thanh toán</div>
              <div className="col-span-2 text-right">Trạng thái & thao tác</div>
            </div>
            {orders.map((order) => {
              const meta = ORDER_STATUS_META[order.status];
              return (
                <div
                  key={order.id}
                  className={`grid grid-cols-12 gap-4 px-6 py-5 border-t border-slate-100 text-sm items-center border-l-4 ${meta.accent} ${meta.rowBg} hover:bg-opacity-60 transition-colors duration-200`}
                >
                  <div className="col-span-2">
                    <p className="font-semibold text-slate-900">{order.code}</p>
                    <p className="text-xs text-slate-500 truncate">#{order.id.slice(0, 8)}</p>
                  </div>
                  <div className="col-span-3">
                    <p className="font-medium text-slate-900">{order.customerName}</p>
                    <p className="text-xs text-slate-500 inline-flex items-center gap-1">
                      <Mail className="w-3 h-3" />
                      {order.customerEmail}
                    </p>
                  </div>
                  <div className="col-span-2 text-xs text-slate-600 space-y-1">
                    <span className="inline-flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      {order.customerPhone}
                    </span>
                    <span className="text-slate-500 block">{formatDate(order.createdAt)}</span>
                  </div>
                  <div className="col-span-1 text-right font-semibold text-slate-900">
                    {formatter.format(order.total)}
                  </div>
                  <div className="col-span-2 flex flex-col gap-1 text-xs text-slate-600">
                    <span className="font-medium">{order.paymentMethod || "—"}</span>
                    {order.paymentStatus ? (
                      <span
                        className={`inline-flex items-center justify-center rounded-full px-2 py-0.5 ${PAYMENT_STATUS_META[order.paymentStatus].chip}`}
                      >
                        {PAYMENT_STATUS_META[order.paymentStatus].label}
                      </span>
                    ) : (
                      <span className="inline-flex items-center justify-center rounded-full px-2 py-0.5 bg-slate-100 text-slate-600">
                        Chưa tạo
                      </span>
                    )}
                  </div>
                  <div className="col-span-2 flex flex-col gap-2 items-end">
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${meta.badge}`}>
                      {meta.label}
                    </span>
                    <div className="flex gap-2 w-full">
                      <Link
                        href={`/staff/orders/${order.id}`}
                        className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg bg-slate-900 text-white text-xs font-semibold px-3 py-2 hover:bg-slate-800"
                      >
                        <Eye className="w-4 h-4" />
                        Chi tiết
                      </Link>
                      <select
                        value={order.status}
                        onChange={(e) => handleQuickUpdate(order.id, e.target.value as OrderStatus)}
                        disabled={updatingId === order.id}
                        className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700"
                      >
                        {(Object.keys(ORDER_STATUS_META) as OrderStatus[]).map((stt) => (
                          <option key={stt} value={stt}>
                            {ORDER_STATUS_META[stt].label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="lg:hidden space-y-4">
            {orders.map((order) => {
              const meta = ORDER_STATUS_META[order.status];
              return (
                <div
                  key={order.id}
                  className={`rounded-2xl border ${meta.mobileBorder} bg-white p-4 shadow-sm space-y-3`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-slate-500">Mã đơn</p>
                      <p className="text-base font-semibold text-slate-900">{order.code}</p>
                    </div>
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${meta.badge}`}>
                      {meta.label}
                    </span>
                  </div>
                  <div className="space-y-2 text-sm text-slate-600">
                    <div>
                      <p className="text-xs text-slate-500">Khách hàng</p>
                      <p className="font-medium text-slate-900">{order.customerName}</p>
                      <p className="text-xs text-slate-500">{order.customerEmail}</p>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <Phone className="w-3 h-3" />
                      {order.customerPhone}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500">Ngày tạo</span>
                      <span className="text-sm text-slate-900">{formatDate(order.createdAt)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500">Tổng tiền</span>
                      <span className="text-sm font-semibold text-slate-900">{formatter.format(order.total)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500">Thanh toán</span>
                      <span className="text-right text-xs">
                        {order.paymentMethod || "—"}
                        <br />
                        {order.paymentStatus ? (
                          <span className={`inline-flex mt-1 px-2 py-0.5 rounded-full ${PAYMENT_STATUS_META[order.paymentStatus].chip}`}>
                            {PAYMENT_STATUS_META[order.paymentStatus].label}
                          </span>
                        ) : (
                          <span className="inline-flex mt-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                            Chưa tạo
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Link
                      href={`/staff/orders/${order.id}`}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 text-white text-sm font-semibold px-3 py-2 hover:bg-slate-800"
                    >
                      <Eye className="w-4 h-4" />
                      Chi tiết
                    </Link>
                    <select
                      value={order.status}
                      onChange={(e) => handleQuickUpdate(order.id, e.target.value as OrderStatus)}
                      disabled={updatingId === order.id}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                    >
                      {(Object.keys(ORDER_STATUS_META) as OrderStatus[]).map((stt) => (
                        <option key={stt} value={stt}>
                          {ORDER_STATUS_META[stt].label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      <div className="flex items-center justify-between">
        <button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1 || loading}
          className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50"
        >
          <ChevronLeft className="w-4 h-4" />
          Trước
        </button>
        <div className="text-sm text-slate-500">
          Trang {page} / {totalPages}
        </div>
        <button
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          disabled={page === totalPages || loading}
          className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50"
        >
          Sau
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
