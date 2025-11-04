"use client";

// app/order/page.tsx
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Search, Filter, Eye, RefreshCcw, ChevronLeft, ChevronRight, BadgeCheck } from "lucide-react";
import type { OrderListItemDTO } from "../../dto/order.dto";

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
    delivered: "bg-green-50 text-green-700 ring-1 ring-green-200",
    cancelled: "bg-rose-50 text-rose-700 ring-1 ring-rose-200",
  };
  if (!status) return null;
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${styles[status]}`}>
      {STATUS_LABEL[status]}
    </span>
  );
}

export default function OrderListPage() {
  const [orders, setOrders] = useState<OrderListItemDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"" | NonNullable<OrderListItemDTO["status"]>>("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const r = await fetch("/api/orders", { cache: "no-store" });
        if (!r.ok) throw new Error("no api");
        const data = (await r.json()) as OrderListItemDTO[];
        setOrders(data);
      } catch {
        // mock nếu chưa có API
        const mock: OrderListItemDTO[] = Array.from({ length: 24 }).map((_, i) => ({
          id: String(1000 + i),
          code: `#AHSO-${1000 + i}`,
          createdAt: new Date(Date.now() - i * 86400000).toISOString(),
          customerName: ["Nguyễn Văn A", "Trần Thị B", "Lê Hoàng C", "Phạm Duy D"][i % 4],
          total: 150000 + i * 12345,
          status: (["pending", "paid", "processing", "shipped", "delivered", "cancelled"] as const)[i % 6],
        }));
        setOrders(mock);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      const hitQ =
        q.trim() === "" ||
        o.code.toLowerCase().includes(q.toLowerCase()) ||
        o.customerName.toLowerCase().includes(q.toLowerCase());
      const hitStatus = status === "" || o.status === status;
      return hitQ && hitStatus;
    });
  }, [orders, q, status]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageData = filtered.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    setPage(1);
  }, [q, status]);

  return (
    <div className="mx-auto max-w-7xl p-4 sm:p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Đơn hàng</h1>
        <div className="hidden md:flex items-center gap-2 text-sm text-gray-500">
          <BadgeCheck className="w-4 h-4" />
          <span>DTO + UI đồng bộ</span>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tìm theo mã đơn / khách hàng…"
            className="w-full rounded-xl border border-gray-200 bg-white px-9 py-2.5 text-sm outline-none ring-0 focus:border-blue-300"
          />
        </div>

        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as any)}
            className="w-full appearance-none rounded-xl border border-gray-200 bg-white px-9 py-2.5 text-sm outline-none focus:border-blue-300"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="pending">Chờ thanh toán</option>
            <option value="paid">Đã thanh toán</option>
            <option value="processing">Đang xử lý</option>
            <option value="shipped">Đã gửi hàng</option>
            <option value="delivered">Đã giao</option>
            <option value="cancelled">Đã hủy</option>
          </select>
        </div>

        <button
          onClick={() => {
            setQ("");
            setStatus("");
            setPage(1);
          }}
          className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium hover:bg-gray-50"
        >
          <RefreshCcw className="mr-2 h-4 w-4" />
          Đặt lại
        </button>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="hidden w-full grid-cols-12 gap-4 p-4 text-xs font-semibold text-gray-500 sm:grid">
          <div className="col-span-3">Mã đơn</div>
          <div className="col-span-2">Ngày tạo</div>
          <div className="col-span-3">Khách hàng</div>
          <div className="col-span-2 text-right">Tổng tiền</div>
          <div className="col-span-1">Trạng thái</div>
          <div className="col-span-1 text-right">Thao tác</div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-sm text-gray-500">Đang tải…</div>
        ) : pageData.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-500">Không có đơn hàng phù hợp.</div>
        ) : (
          pageData.map((o) => (
            <div
              key={o.id}
              className="grid w-full grid-cols-1 gap-2 border-t border-gray-100 p-4 sm:grid-cols-12 sm:items-center sm:gap-4"
            >
              <div className="sm:col-span-3">
                <div className="font-medium text-gray-900">{o.code}</div>
                <div className="mt-0.5 text-xs text-gray-500">ID: {o.id}</div>
              </div>
              <div className="sm:col-span-2 text-gray-700">
                {new Date(o.createdAt).toLocaleDateString("vi-VN")}
              </div>
              <div className="sm:col-span-3">
                <div className="text-gray-900">{o.customerName}</div>
              </div>
              <div className="sm:col-span-2 text-right font-medium">{formatVND(o.total)}</div>
              <div className="sm:col-span-1">
                {o.status ? <StatusBadge status={o.status} /> : null}
              </div>
              <div className="sm:col-span-1 flex sm:justify-end">
                <Link
                  href={`/order/${o.id}`}
                  className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-700"
                >
                  <Eye className="h-4 w-4" />
                  Xem
                </Link>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
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
