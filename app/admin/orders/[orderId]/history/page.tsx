import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import { Clock, ArrowLeft, Shield, FileText, User } from "lucide-react";
import type { OrderDetailDTO, OrderStatus } from "@/dto/order.dto";

function statusLabel(status: OrderStatus) {
  return (
    {
      pending: "Chờ thanh toán",
      paid: "Đã thanh toán",
      processing: "Đang xử lý",
      shipped: "Đã gửi hàng",
      delivered: "Đã giao",
      cancel_requested: "Khách yêu cầu hủy",
      cancelled: "Đã hủy",
    }[status] || status
  );
}

async function fetchOrder(orderId: string) {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;
  if (!token) {
    redirect(`/login?redirect=/admin/orders/${orderId}/history`);
  }

  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXTAUTH_URL ||
    "http://localhost:3000";

  const res = await fetch(new URL(`/api/orders/${orderId}`, baseUrl).toString(), {
    cache: "no-store",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (res.status === 401 || res.status === 403) {
    redirect(`/login?redirect=/admin/orders/${orderId}/history`);
  }

  if (res.status === 404) {
    notFound();
  }

  if (!res.ok) {
    throw new Error(`Failed to load order ${orderId}: ${res.status}`);
  }

  return (await res.json()) as OrderDetailDTO;
}

export default async function AdminOrderHistoryPage(props: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await props.params;
  const order = await fetchOrder(orderId);
  const history = order.history || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Link
            href="/admin/orders"
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
          >
            <ArrowLeft className="w-4 h-4" />
            Danh sách đơn
          </Link>
          <div>
            <p className="text-xs text-slate-500">Mã đơn</p>
            <h1 className="text-xl font-semibold text-slate-900">{order.code}</h1>
          </div>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-800">
          <Shield className="w-4 h-4" />
          {statusLabel(order.status)}
        </span>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <Clock className="w-4 h-4" />
          Lịch sử trạng thái
        </div>
        {history.length === 0 ? (
          <p className="text-sm text-slate-500">Chưa có log trạng thái.</p>
        ) : (
          <div className="space-y-3">
            {history.map((h) => (
              <div
                key={h.id}
                className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2"
              >
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>{new Date(h.createdAt).toLocaleString("vi-VN")}</span>
                  <span className="font-semibold text-slate-700">
                    {statusLabel(h.toStatus)}
                  </span>
                </div>
                <div className="text-xs text-slate-600 mt-1">
                  {h.fromStatus
                    ? `Chuyển từ ${statusLabel(h.fromStatus)} → ${statusLabel(h.toStatus)}`
                    : `Đặt trạng thái ${statusLabel(h.toStatus)}`}
                </div>
                {h.reason && (
                  <p className="text-xs text-slate-700 mt-1 whitespace-pre-line">
                    Lý do: {h.reason}
                  </p>
                )}
                {h.createdBy && (
                  <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                    <User className="w-3 h-3" />
                    Bởi: {h.createdByName || h.createdBy}{" "}
                    {h.createdByRole ? `(${h.createdByRole})` : ""}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <FileText className="w-4 h-4" />
          Thông tin nhanh
        </div>
        <div className="grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
          <div>
            <p className="text-slate-500 text-xs uppercase">Khách hàng</p>
            <p className="font-medium text-slate-900">{order.customer?.name}</p>
            {order.customer?.email && <p className="text-slate-600">{order.customer.email}</p>}
            {order.customer?.phone && <p className="text-slate-600">{order.customer.phone}</p>}
          </div>
          <div>
            <p className="text-slate-500 text-xs uppercase">Tổng tiền</p>
            <p className="font-semibold text-slate-900">
              {order.pricing?.grandTotal?.toLocaleString("vi-VN")} ₫
            </p>
            <p className="text-slate-600 text-xs">
              Đã thanh toán: {order.payment?.paidAmount?.toLocaleString("vi-VN") || 0} ₫
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
