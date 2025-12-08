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
  X,
  AlertTriangle,
  TrendingUp,
  ArrowUpRight,
} from "lucide-react";
import { toast } from "sonner";

type OrderStatus =
  | "pending"
  | "paid"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancel_requested"
  | "cancelled";

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
    badge: "bg-gradient-to-r from-amber-50 to-amber-100 text-amber-800 ring-1 ring-amber-300/50",
    cardBg: "bg-gradient-to-br from-amber-50 to-amber-100/50",
    cardBorder: "border-amber-200",
    cardText: "text-amber-900",
    iconBg: "bg-amber-500/10 text-amber-600",
    accent: "border-amber-400",
    rowBg: "bg-amber-50/30 hover:bg-amber-50/50",
    mobileBorder: "border-amber-200",
    icon: Clock3,
  },
  paid: {
    label: "Đã thanh toán",
    hint: "Đã nhận đủ tiền",
    badge: "bg-gradient-to-r from-emerald-50 to-emerald-100 text-emerald-800 ring-1 ring-emerald-300/50",
    cardBg: "bg-gradient-to-br from-emerald-50 to-emerald-100/50",
    cardBorder: "border-emerald-200",
    cardText: "text-emerald-900",
    iconBg: "bg-emerald-500/10 text-emerald-600",
    accent: "border-emerald-400",
    rowBg: "bg-emerald-50/30 hover:bg-emerald-50/50",
    mobileBorder: "border-emerald-200",
    icon: BadgeCheck,
  },
  processing: {
    label: "Đang xử lý",
    hint: "Đang chuẩn bị hàng",
    badge: "bg-gradient-to-r from-blue-50 to-blue-100 text-blue-800 ring-1 ring-blue-300/50",
    cardBg: "bg-gradient-to-br from-blue-50 to-blue-100/50",
    cardBorder: "border-blue-200",
    cardText: "text-blue-900",
    iconBg: "bg-blue-500/10 text-blue-600",
    accent: "border-blue-400",
    rowBg: "bg-blue-50/30 hover:bg-blue-50/50",
    mobileBorder: "border-blue-200",
    icon: Settings2,
  },
  shipped: {
    label: "Đã gửi hàng",
    hint: "Chờ đơn vị vận chuyển",
    badge: "bg-gradient-to-r from-indigo-50 to-indigo-100 text-indigo-800 ring-1 ring-indigo-300/50",
    cardBg: "bg-gradient-to-br from-indigo-50 to-indigo-100/50",
    cardBorder: "border-indigo-200",
    cardText: "text-indigo-900",
    iconBg: "bg-indigo-500/10 text-indigo-600",
    accent: "border-indigo-400",
    rowBg: "bg-indigo-50/30 hover:bg-indigo-50/50",
    mobileBorder: "border-indigo-200",
    icon: Truck,
  },
  delivered: {
    label: "Đã giao",
    hint: "Hoàn tất giao hàng",
    badge: "bg-gradient-to-r from-green-50 to-green-100 text-green-800 ring-1 ring-green-300/50",
    cardBg: "bg-gradient-to-br from-green-50 to-green-100/50",
    cardBorder: "border-green-200",
    cardText: "text-green-900",
    iconBg: "bg-green-500/10 text-green-600",
    accent: "border-green-400",
    rowBg: "bg-green-50/30 hover:bg-green-50/50",
    mobileBorder: "border-green-200",
    icon: CheckCircle2,
  },
  cancel_requested: {
    label: "Yêu cầu hủy",
    hint: "Khách đã gửi yêu cầu hủy đơn",
    badge: "bg-gradient-to-r from-orange-50 to-orange-100 text-orange-800 ring-1 ring-orange-300/50",
    cardBg: "bg-gradient-to-br from-orange-50 to-orange-100/50",
    cardBorder: "border-orange-200",
    cardText: "text-orange-900",
    iconBg: "bg-orange-500/10 text-orange-600",
    accent: "border-orange-400",
    rowBg: "bg-orange-50/30 hover:bg-orange-50/50",
    mobileBorder: "border-orange-200",
    icon: AlertTriangle,
  },
  cancelled: {
    label: "Đã hủy",
    hint: "Khách hoặc hệ thống hủy",
    badge: "bg-gradient-to-r from-rose-50 to-rose-100 text-rose-800 ring-1 ring-rose-300/50",
    cardBg: "bg-gradient-to-br from-rose-50 to-rose-100/50",
    cardBorder: "border-rose-200",
    cardText: "text-rose-900",
    iconBg: "bg-rose-500/10 text-rose-600",
    accent: "border-rose-400",
    rowBg: "bg-rose-50/30 hover:bg-rose-50/50",
    mobileBorder: "border-rose-200",
    icon: XCircle,
  },
};

function formatDate(value: string) {
  try {
    return new Date(value).toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
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

const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  pending: "paid",
  paid: "processing",
  processing: "shipped",
  shipped: "delivered",
  cancel_requested: "cancelled",
};

const NEXT_STATUS_LABEL: Partial<Record<OrderStatus, string>> = {
  pending: "Xác nhận đã thanh toán",
  paid: "Xử lý đơn hàng",
  processing: "Đã gửi hàng",
  shipped: "Giao hàng thành công",
  cancel_requested: "Duyệt hủy đơn",
};

type ActionKind = "advance" | "cancel";

type PendingAction = {
  type: ActionKind;
  order: StaffOrder;
  nextStatus: OrderStatus;
};

export default function StaffOrdersPage() {
  const [orders, setOrders] = useState<StaffOrder[]>([]);
  const [stats, setStats] = useState<Record<OrderStatus, number>>({
    pending: 0,
    paid: 0,
    processing: 0,
    shipped: 0,
    delivered: 0,
    cancel_requested: 0,
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

  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [submittingAction, setSubmittingAction] = useState(false);

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
      } catch (err) {
        if (ignore) return;
        if (err instanceof DOMException && err.name === "AbortError") return;
        const message = err instanceof Error ? err.message : "Đã xảy ra lỗi";
        setError(message);
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

  useEffect(() => {
    if (!pendingAction) {
      setCountdown(0);
      setCancelReason("");
      return;
    }
    setCountdown(5);
    const id = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(id);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [pendingAction]);

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const hasData = orders.length > 0;

  const summaryCards = useMemo(
    () =>
      (Object.keys(ORDER_STATUS_META) as OrderStatus[]).map((s) => {
        const meta = ORDER_STATUS_META[s];
        return { status: s, count: stats[s] || 0, ...meta };
      }),
    [stats],
  );

  type PatchOrderBody = { status: OrderStatus; cancelReason?: string };

  async function patchOrder(orderId: string, body: PatchOrderBody) {
    const res = await fetch(`/api/staff/orders/${orderId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      credentials: "include",
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as unknown;
      const errorMessage =
        data &&
        typeof data === "object" &&
        "error" in data &&
        typeof (data as { error?: unknown }).error === "string"
          ? (data as { error: string }).error
          : "Không thể cập nhật trạng thái";
      throw new Error(errorMessage);
    }
  }

  function openAdvanceAction(order: StaffOrder) {
    const nextStatus = NEXT_STATUS[order.status];
    if (!nextStatus) return;
    setPendingAction({ type: "advance", order, nextStatus });
  }

  function openCancelAction(order: StaffOrder) {
    const canCancel = ["pending", "paid", "processing", "shipped"].includes(order.status);
    if (!canCancel) return;
    setPendingAction({ type: "cancel", order, nextStatus: "cancelled" });
  }

  async function handleConfirmAction() {
    if (!pendingAction) return;
    setSubmittingAction(true);
    try {
      const body: PatchOrderBody = { status: pendingAction.nextStatus };
      if (pendingAction.type === "cancel") {
        body.cancelReason = cancelReason.trim();
      }

      await patchOrder(pendingAction.order.id, body);
      toast.success("Đã cập nhật đơn hàng thành công");
      setPendingAction(null);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Không thể cập nhật trạng thái";
      toast.error(message);
    } finally {
      setSubmittingAction(false);
    }
  }

  const confirmDisabled =
    !pendingAction ||
    submittingAction ||
    countdown > 0 ||
    (pendingAction.type === "cancel" && cancelReason.trim().length < 5);

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 text-xs text-slate-500 uppercase tracking-[0.2em] font-bold">
          <TrendingUp className="w-3.5 h-3.5" />
          Theo dõi & vận hành
        </div>
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Đơn hàng</h1>
            <p className="text-sm text-slate-600 mt-1">
              Quản lý toàn bộ lifecycle đơn hàng với số liệu cập nhật theo thời gian thực
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <div className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 font-semibold">
              {totalItems} đơn hàng
            </div>
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <button
              key={card.status}
              onClick={() => setStatus(card.status)}
              className={`group relative rounded-2xl border-2 ${
                status === card.status ? card.cardBorder : "border-slate-200"
              } ${card.cardBg} p-4 flex flex-col gap-2 shadow-sm hover:shadow-md transition-all cursor-pointer ${
                status === card.status ? "ring-2 ring-offset-2 ring-blue-500/20" : ""
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 text-left">
                  <p className="text-[10px] uppercase tracking-wide text-slate-500 font-bold mb-1">
                    {card.hint}
                  </p>
                  <p className={`text-xs font-semibold ${card.cardText}`}>{card.label}</p>
                </div>
                <div
                  className={`p-2 rounded-xl shadow-sm ${card.iconBg} group-hover:scale-110 transition-transform`}
                >
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-end justify-between">
                <p className={`text-2xl font-bold ${card.cardText}`}>{card.count}</p>
                {status === card.status && <ArrowUpRight className="w-4 h-4 text-blue-600" />}
              </div>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 lg:p-6 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2 lg:col-span-1">
            <label className="text-xs font-bold text-slate-700 mb-2 block">Tìm kiếm</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Mã đơn, tên, email, SĐT..."
                className="w-full rounded-xl border-2 border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm focus:border-blue-400 focus:bg-white outline-none transition-all"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 mb-2 block">Trạng thái</label>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as OrderStatus | "")}
                className="w-full appearance-none rounded-xl border-2 border-slate-200 bg-slate-50 py-2.5 pl-10 pr-8 text-sm focus:border-blue-400 focus:bg-white outline-none transition-all"
              >
                <option value="">Tất cả</option>
                {(Object.keys(ORDER_STATUS_META) as OrderStatus[]).map((s) => (
                  <option key={s} value={s}>
                    {ORDER_STATUS_META[s].label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 mb-2 block">Từ ngày</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full rounded-xl border-2 border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm focus:border-blue-400 focus:bg-white outline-none transition-all"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 mb-2 block">Đến ngày</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full rounded-xl border-2 border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm focus:border-blue-400 focus:bg-white outline-none transition-all"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-4 border-t border-slate-200">
          <div className="text-sm text-slate-600 font-medium">
            Hiển thị trang <span className="font-bold text-slate-900">{page}</span> / {totalPages}
          </div>
          <button
            onClick={() => {
              setQ("");
              setStatus("");
              setDateFrom("");
              setDateTo("");
              setPage(1);
            }}
            className="inline-flex items-center gap-2 rounded-xl border-2 border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all"
          >
            <RefreshCcw className="w-4 h-4" />
            Đặt lại bộ lọc
          </button>
        </div>
      </div>

      {/* Table / list */}
      {loading || error || !hasData ? (
        <div className="rounded-2xl border-2 border-slate-200 bg-white shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-16 flex flex-col items-center justify-center gap-3 text-slate-500">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
              <p className="text-sm font-medium">Đang tải dữ liệu...</p>
            </div>
          ) : error ? (
            <div className="p-12 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-rose-100 text-rose-600 mb-4">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <p className="text-sm font-semibold text-rose-600">{error}</p>
            </div>
          ) : (
            <div className="p-12 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 text-slate-400 mb-4">
                <Search className="w-8 h-8" />
              </div>
              <p className="text-sm font-semibold text-slate-600">Không tìm thấy đơn hàng</p>
              <p className="text-xs text-slate-500 mt-1">Thử điều chỉnh bộ lọc của bạn</p>
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden xl:block rounded-2xl border-2 border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-linear-to-r from-slate-50 to-slate-100 border-b-2 border-slate-200">
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
                      Mã đơn
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
                      Khách hàng
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
                      Liên hệ
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
                  {orders.map((order) => {
                    const meta = ORDER_STATUS_META[order.status];
                    const canCancel = ["pending", "paid", "processing", "shipped"].includes(order.status);
                    const nextStatus = NEXT_STATUS[order.status];
                    const hasAdvance = !!nextStatus;

                    return (
                      <tr
                        key={order.id}
                        className={`border-l-4 ${meta.accent} ${meta.rowBg} transition-all`}
                      >
                        <td className="px-6 py-5">
                          <div>
                            <p className="font-bold text-slate-900 text-sm">{order.code}</p>
                            <p className="text-xs text-slate-500 font-mono">#{order.id.slice(0, 8)}</p>
                            <p className="text-[10px] text-slate-400 mt-1">
                              {formatDate(order.createdAt)}
                            </p>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <div>
                            <p className="font-semibold text-slate-900 text-sm">
                              {order.customerName}
                            </p>
                            <p className="text-xs text-slate-600 flex items-center gap-1 mt-1">
                              <Mail className="w-3 h-3" />
                              {order.customerEmail}
                            </p>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <p className="text-xs text-slate-700 flex items-center gap-1.5 font-medium">
                            <Phone className="w-3.5 h-3.5" />
                            {order.customerPhone}
                          </p>
                        </td>
                        <td className="px-6 py-5 text-right">
                          <p className="font-bold text-slate-900">{formatter.format(order.total)}</p>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex justify-center">
                            <span
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${meta.badge}`}
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                              {meta.label}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              href={`/staff/orders/${order.id}`}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 text-white text-xs font-bold px-3 py-2 hover:bg-slate-800 transition-all hover:shadow-lg"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              Chi tiết
                            </Link>

                            {hasAdvance && (
                              <button
                                type="button"
                                onClick={() => openAdvanceAction(order)}
                                className="inline-flex items-center rounded-lg border-2 border-slate-200 bg-white text-[11px] font-bold px-3 py-2 text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all whitespace-nowrap"
                              >
                                {NEXT_STATUS_LABEL[order.status]}
                              </button>
                            )}

                            {canCancel && (
                              <button
                                type="button"
                                onClick={() => openCancelAction(order)}
                                className="inline-flex items-center rounded-lg bg-rose-50 text-[11px] font-bold px-3 py-2 text-rose-700 hover:bg-rose-100 transition-all whitespace-nowrap"
                              >
                                Hủy đơn
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Tablet & Mobile cards */}
          <div className="xl:hidden space-y-4">
            {orders.map((order) => {
              const meta = ORDER_STATUS_META[order.status];
              const canCancel = ["pending", "paid", "processing", "shipped"].includes(
                order.status,
              );
              const nextStatus = NEXT_STATUS[order.status];
              const hasAdvance = !!nextStatus;
              const Icon = meta.icon;

              return (
                <div
                  key={order.id}
                  className={`rounded-2xl border-2 ${meta.mobileBorder} bg-white shadow-sm hover:shadow-md transition-all overflow-hidden`}
                >
                  <div className={`${meta.cardBg} px-4 py-3 border-b-2 ${meta.mobileBorder}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-xl ${meta.iconBg}`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-xs text-slate-600 font-semibold">Mã đơn</p>
                          <p className="text-base font-bold text-slate-900">{order.code}</p>
                          <p className="text-[10px] text-slate-500 mt-0.5">
                            {formatDate(order.createdAt)}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${meta.badge} whitespace-nowrap`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                        {meta.label}
                      </span>
                    </div>
                  </div>

                  <div className="p-4 space-y-3">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-slate-500 font-semibold mb-1">Khách hàng</p>
                        <p className="font-semibold text-slate-900">{order.customerName}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-slate-500 font-semibold mb-1">Tổng tiền</p>
                        <p className="font-bold text-slate-900">
                          {formatter.format(order.total)}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="flex items-center gap-2 text-slate-600">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        <span className="truncate">{order.customerEmail}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-600 font-medium">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        {order.customerPhone}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 pt-3 border-t border-slate-100">
                      <Link
                        href={`/staff/orders/${order.id}`}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 text-white text-sm font-bold px-4 py-2.5 hover:bg-slate-800 transition-all"
                      >
                        <Eye className="w-4 h-4" />
                        Xem chi tiết
                      </Link>

                      <div className="grid grid-cols-2 gap-2">
                        {hasAdvance && (
                          <button
                            type="button"
                            onClick={() => openAdvanceAction(order)}
                            className="inline-flex items-center justify-center rounded-xl border-2 border-slate-200 bg-white text-xs font-bold px-3 py-2 text-slate-700 hover:bg-slate-50 transition-all"
                          >
                            {NEXT_STATUS_LABEL[order.status]}
                          </button>
                        )}

                        {canCancel && (
                          <button
                            type="button"
                            onClick={() => openCancelAction(order)}
                            className="inline-flex items-center justify-center rounded-xl bg-rose-50 text-xs font-bold px-3 py-2 text-rose-700 hover:bg-rose-100 transition-all"
                          >
                            Hủy đơn
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Pagination */}
      <div className="flex items-center justify-between bg-white rounded-2xl border-2 border-slate-200 p-4 shadow-sm">
        <button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1 || loading}
          className="inline-flex items-center gap-2 rounded-xl border-2 border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Trang trước</span>
        </button>
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-600">Trang</span>
          <span className="px-3 py-1 rounded-lg bg-slate-900 text-white font-bold text-sm">
            {page}
          </span>
          <span className="text-sm text-slate-600">/ {totalPages}</span>
        </div>
        <button
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          disabled={page === totalPages || loading}
          className="inline-flex items-center gap-2 rounded-xl border-2 border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          <span className="hidden sm:inline">Trang sau</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Modal xác nhận */}
      {pendingAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border-2 border-slate-200 overflow-hidden animate-in fade-in zoom-in duration-200">
            <div
              className={`${
                pendingAction.type === "cancel"
                  ? "bg-linear-to-r from-rose-50 to-rose-100"
                  : "bg-linear-to-r from-blue-50 to-blue-100"
              } px-6 py-4 border-b-2 ${
                pendingAction.type === "cancel" ? "border-rose-200" : "border-blue-200"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div
                    className={`p-2 rounded-xl ${
                      pendingAction.type === "cancel"
                        ? "bg-rose-500/10 text-rose-600"
                        : "bg-blue-500/10 text-blue-600"
                    }`}
                  >
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-base font-bold text-slate-900">
                      {pendingAction.type === "cancel"
                        ? "Xác nhận hủy đơn hàng"
                        : "Xác nhận cập nhật trạng thái"}
                    </p>
                    <p className="text-xs text-slate-600 mt-1">
                      Đơn:{" "}
                      <span className="font-mono font-semibold">
                        {pendingAction.order.code}
                      </span>{" "}
                      · Khách:{" "}
                      <span className="font-semibold">{pendingAction.order.customerName}</span>
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setPendingAction(null)}
                  className="rounded-lg p-1.5 hover:bg-slate-900/5 text-slate-600 transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="rounded-xl bg-slate-50 border-2 border-slate-200 p-4">
                <p className="text-xs text-slate-600 font-bold mb-2">THAY ĐỔI TRẠNG THÁI</p>
                <div className="flex items-center justify-between">
                  <span className="px-3 py-1.5 rounded-lg bg-white border-2 border-slate-200 text-sm font-bold text-slate-900">
                    {ORDER_STATUS_META[pendingAction.order.status].label}
                  </span>
                  <div className="flex-1 px-3">
                    <div className="h-0.5 bg-linear-to-r from-slate-300 to-blue-300" />
                  </div>
                  <span className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-sm font-bold">
                    {ORDER_STATUS_META[pendingAction.nextStatus].label}
                  </span>
                </div>
              </div>

              {pendingAction.type === "cancel" && (
                <div>
                  <label className="text-sm font-bold text-slate-700 mb-2 block">
                    Lý do hủy đơn <span className="text-rose-600">*</span>
                  </label>
                  <textarea
                    rows={3}
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    className="w-full rounded-xl border-2 border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:border-rose-400 focus:bg-white outline-none resize-none transition-all"
                    placeholder="Ví dụ: Khách đổi ý, đặt nhầm sản phẩm, trùng đơn... (tối thiểu 5 ký tự)"
                  />
                  <p className="text-xs text-slate-500 mt-2">
                    Lý do sẽ được lưu lại và gửi cho khách trong email thông báo hủy
                  </p>
                </div>
              )}

              <div className="rounded-xl bg-amber-50 border-2 border-amber-200 p-4">
                <div className="flex gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="text-xs text-amber-900">
                    <p className="font-bold mb-1">Lưu ý quan trọng</p>
                    <p>
                      Hành động này sẽ áp dụng trực tiếp lên đơn hàng. Vui lòng kiểm tra kỹ trước
                      khi xác nhận.
                    </p>
                    {countdown > 0 && (
                      <p className="mt-2 font-bold text-amber-700">
                        Bạn có thể xác nhận sau{" "}
                        <span className="text-base">{countdown}s</span>
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t-2 border-slate-200 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setPendingAction(null)}
                disabled={submittingAction}
                className="rounded-xl border-2 border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-700 hover:bg-white transition-all disabled:opacity-50"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmAction}
                disabled={confirmDisabled}
                className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white transition-all disabled:opacity-50 ${
                  pendingAction.type === "cancel"
                    ? "bg-rose-600 hover:bg-rose-700"
                    : "bg-slate-900 hover:bg-slate-800"
                }`}
              >
                {submittingAction && <Loader2 className="w-4 h-4 animate-spin" />}
                {countdown > 0
                  ? `Xác nhận sau ${countdown}s`
                  : pendingAction.type === "cancel"
                  ? "Xác nhận hủy đơn"
                  : "Xác nhận cập nhật"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
