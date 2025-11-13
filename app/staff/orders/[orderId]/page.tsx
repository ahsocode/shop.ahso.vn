import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import type { LucideIcon } from "lucide-react";
import {
  ArrowLeft,
  Calendar,
  CreditCard,
  Truck,
  User,
  MapPin,
  Package,
  FileText,
  Settings2,
  CheckCircle2,
} from "lucide-react";
import type { OrderDetailDTO, OrderStatus } from "@/dto/order.dto";
import StatusManager from "./status-manager";

function formatVND(value: number | undefined | null) {
  const num = typeof value === "number" ? value : Number(value ?? 0);
  return num.toLocaleString("vi-VN") + " ₫";
}

async function fetchOrder(orderId: string) {
  const hdrs = await headers();
  const host = hdrs.get("host");
  if (!host) notFound();
  const protocol = hdrs.get("x-forwarded-proto") ?? "http";
  const base = `${protocol}://${host}`;

  const res = await fetch(`${base}/api/orders/${orderId}`, {
    cache: "no-store",
    headers: {
      cookie: hdrs.get("cookie") ?? "",
    },
  });

  if (res.status === 401 || res.status === 403) {
    redirect(`/login?redirect=/staff/orders/${orderId}`);
  }

  if (res.status === 404) {
    notFound();
  }

  if (!res.ok) {
    throw new Error(`Failed to load order ${orderId}: ${res.status}`);
  }

  return (await res.json()) as OrderDetailDTO;
}

const STATUS_FLOW: OrderStatus[] = ["pending", "paid", "processing", "shipped", "delivered"];
const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "Chờ thanh toán",
  paid: "Đã thanh toán",
  processing: "Đang xử lý",
  shipped: "Đã gửi hàng",
  delivered: "Đã giao",
  cancelled: "Đã hủy",
};

const STATUS_DESC: Record<OrderStatus, string> = {
  pending: "Hệ thống đã ghi nhận đơn và chờ khách chuyển khoản.",
  paid: "Đã xác nhận nhận tiền hoặc thanh toán thành công.",
  processing: "Kho và CSKH đang xử lý yêu cầu.",
  shipped: "Đã bàn giao cho đơn vị vận chuyển.",
  delivered: "Khách đã nhận đủ hàng.",
  cancelled: "Đơn hàng bị hủy theo yêu cầu hoặc hệ thống.",
};

const STATUS_ICONS: Record<OrderStatus, LucideIcon> = {
  pending: Calendar,
  paid: CreditCard,
  processing: Settings2,
  shipped: Truck,
  delivered: CheckCircle2,
  cancelled: FileText,
};

export default async function StaffOrderDetailPage(props: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await props.params;
  const order = await fetchOrder(orderId);

  const status = order.status ?? "pending";
  const pricing = order.pricing || {
    subtotal: 0,
    discountTotal: 0,
    taxTotal: 0,
    shippingFee: order.shipping?.fee ?? 0,
    grandTotal: 0,
  };

  const items = order.items || [];
  const customer = order.customer || { name: "" };
  const shippingAddress = order.shippingAddress;

  const statusIndex =
    status === "cancelled" ? -1 : STATUS_FLOW.findIndex((s) => s === status);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/staff/orders"
            className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
          >
            <ArrowLeft className="w-4 h-4" />
            Danh sách đơn
          </Link>
          <div>
            <p className="text-sm text-slate-500">Mã đơn</p>
            <h1 className="text-2xl font-bold text-slate-900">{order.code}</h1>
          </div>
        </div>
        <div className="text-right">
          <span
            className={[
              "inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-semibold",
              status === "cancelled"
                ? "bg-rose-50 text-rose-700"
                : status === "delivered"
                ? "bg-emerald-50 text-emerald-700"
                : "bg-blue-50 text-blue-700",
            ].join(" ")}
          >
            {STATUS_LABEL[status]}
          </span>
          <p className="text-xs text-slate-500 mt-1 max-w-xs">{STATUS_DESC[status]}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-4">
            {STATUS_FLOW.map((step, idx) => {
              const done = status !== "cancelled" && idx <= statusIndex;
              const Icon = STATUS_ICONS[step];
              return (
                <div key={step} className="flex items-center gap-3">
                  <div
                    className={`h-10 w-10 rounded-full flex items-center justify-center border-2 ${
                      done ? "border-blue-500 bg-blue-50 text-blue-600" : "border-slate-200 text-slate-400"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{STATUS_LABEL[step]}</p>
                    <p className="text-xs text-slate-500">
                      {idx === 0 ? "Tạo đơn" : idx === STATUS_FLOW.length - 1 ? "Hoàn tất" : "Bước xử lý"}
                    </p>
                  </div>
                  {idx < STATUS_FLOW.length - 1 && <div className="w-10 h-0.5 bg-slate-200 hidden md:block" />}
                </div>
              );
            })}
          </div>
          {status === "cancelled" && (
            <div className="p-3 rounded-xl bg-rose-50 text-rose-700 text-sm">
              Đơn hàng đã bị hủy. Vui lòng liên hệ khách hàng nếu cần khôi phục.
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 flex items-center gap-3">
          <Calendar className="w-10 h-10 p-2 rounded-xl bg-slate-100 text-slate-700" />
          <div>
            <p className="text-xs uppercase text-slate-500 tracking-wide">Ngày tạo</p>
            <p className="text-base font-semibold text-slate-900">
              {new Date(order.createdAt).toLocaleString("vi-VN")}
            </p>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 flex items-center gap-3">
          <CreditCard className="w-10 h-10 p-2 rounded-xl bg-slate-100 text-slate-700" />
          <div>
            <p className="text-xs uppercase text-slate-500 tracking-wide">Thanh toán</p>
            <p className="text-base font-semibold text-slate-900">
              {order.payment?.method || "Không rõ"}
            </p>
            <p className="text-sm text-slate-500">Đã thu: {formatVND(order.payment?.paidAmount)}</p>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 flex items-center gap-3">
          <Truck className="w-10 h-10 p-2 rounded-xl bg-slate-100 text-slate-700" />
          <div>
            <p className="text-xs uppercase text-slate-500 tracking-wide">Vận chuyển</p>
            <p className="text-base font-semibold text-slate-900">
              {order.shipping?.method || "Chưa có phương thức"}
            </p>
            <p className="text-sm text-slate-500">Phí: {formatVND(pricing.shippingFee)}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
            <div className="border-b border-slate-100 px-4 py-3 flex items-center gap-2 font-semibold text-slate-900">
              <Package className="w-4 h-4" />
              Danh sách sản phẩm
            </div>
            <div className="divide-y divide-slate-100">
              {items.map((item) => {
                const qty = typeof item.qty === "number" ? item.qty : 1;
                const price = typeof item.price === "number" ? item.price : 0;
                const lineTotal = price * qty;
                return (
                  <div key={item.sku} className="p-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.image || "/placeholder.png"}
                        alt={item.name}
                        className="h-12 w-12 rounded-xl border border-slate-100 object-cover"
                      />
                      <div>
                        <p className="font-medium text-slate-900">{item.name}</p>
                        <p className="text-xs text-slate-500">SKU: {item.sku}</p>
                      </div>
                    </div>
                    <div className="text-sm text-slate-600 flex items-center gap-6">
                      <span>Số lượng: <strong>{qty}</strong></span>
                      <span>Đơn giá: <strong>{formatVND(price)}</strong></span>
                      <span className="text-slate-900 font-semibold">{formatVND(lineTotal)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="border-t border-slate-100 p-4">
              <div className="max-w-md ml-auto space-y-2 text-sm">
                <div className="flex justify-between text-slate-600">
                  <span>Tạm tính</span>
                  <span>{formatVND(pricing.subtotal)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Giảm giá</span>
                  <span>-{formatVND(pricing.discountTotal)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Thuế</span>
                  <span>{formatVND(pricing.taxTotal)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Phí vận chuyển</span>
                  <span>{formatVND(pricing.shippingFee)}</span>
                </div>
                <div className="flex justify-between border-t pt-2 text-base font-semibold text-slate-900">
                  <span>Tổng cộng</span>
                  <span>{formatVND(pricing.grandTotal)}</span>
                </div>
              </div>
            </div>
          </div>

          {order.note && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
              <FileText className="w-5 h-5 text-amber-600" />
              <div>
                <p className="font-semibold text-amber-800">Ghi chú của khách</p>
                <p className="text-sm text-amber-700 whitespace-pre-line">{order.note}</p>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <User className="w-4 h-4" />
              Thông tin khách hàng
            </div>
            <div className="text-sm text-slate-700 space-y-1">
              <p>{customer.name}</p>
              {customer.email && <p className="text-slate-500">Email: {customer.email}</p>}
              {customer.phone && <p className="text-slate-500">SĐT: {customer.phone}</p>}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <MapPin className="w-4 h-4" />
              Địa chỉ giao hàng
            </div>
            {shippingAddress ? (
              <div className="text-sm text-slate-700 space-y-1">
                <p>{shippingAddress.line1}</p>
                {shippingAddress.line2 && <p>{shippingAddress.line2}</p>}
                <p>
                  {shippingAddress.district ? `${shippingAddress.district}, ` : ""}
                  {shippingAddress.city}
                  {shippingAddress.province ? `, ${shippingAddress.province}` : ""}
                </p>
              </div>
            ) : (
              <p className="text-sm text-slate-500">Chưa có địa chỉ.</p>
            )}
          </div>

          <StatusManager
            orderId={order.id}
            initialStatus={status}
            initialNote={order.note || ""}
            initialShippingMethod={order.shipping?.method || ""}
          />
        </div>
      </div>
    </div>
  );
}
