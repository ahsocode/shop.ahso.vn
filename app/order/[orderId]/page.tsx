// app/order/[orderId]/page.tsx
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";

import {
  Package,
  User,
  ChevronLeft,
  MapPin,
  CreditCard,
  Truck,
  Calendar,
  Receipt,
} from "lucide-react";
import type { OrderDetailDTO } from "@/dto/order.dto";

function formatVND(n: number | undefined | null) {
  const num = typeof n === "number" ? n : Number(n || 0);
  return num.toLocaleString("vi-VN") + " ₫";
}

type OrderStatus =
  | "pending"
  | "paid"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled";

const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "Chờ thanh toán",
  paid: "Đã thanh toán",
  processing: "Đang xử lý",
  shipped: "Đã gửi hàng",
  delivered: "Đã giao",
  cancelled: "Đã hủy",
};

function paymentMethodLabel(method?: string | null) {
  const m = (method || "").toUpperCase();
  if (m === "BANK_TRANSFER_QR" || m === "BANK_TRANSFER")
    return "Chuyển khoản ngân hàng (QR)";
  if (m === "COD") return "Thanh toán khi nhận hàng (COD)";
  if (m === "VNPAY") return "Thanh toán VNPAY";
  return method || "Không rõ";
}

// Next 16: params là Promise => cần await
export default async function OrderDetailPage(props: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await props.params;

 // ✅ đúng
const hdrs = await headers(); // ReadonlyHeaders
const host = hdrs.get("host");
if (!host) return notFound();
const protocol = hdrs.get("x-forwarded-proto") ?? "http";
const base = `${protocol}://${host}`;

const res = await fetch(`${base}/api/orders/${orderId}`, {
  cache: "no-store",
  headers: {
    cookie: hdrs.get("cookie") ?? "",
  },
});


  // Nếu chưa đăng nhập hoặc bị cấm → cho về trang login, không chơi 404
  if (res.status === 401 || res.status === 403) {
    redirect(`/login?redirect=/order/${orderId}`);
  }

  if (res.status === 404) {
    notFound();
  }

  if (!res.ok) {
    // cho nó nổ lỗi rõ ràng hơn khi dev
    throw new Error(`Failed to load order ${orderId}: ${res.status}`);
  }

  const data = (await res.json()) as OrderDetailDTO;

  const status: OrderStatus = data.status ?? "pending";

  // ====== TÍNH TIỀN (dùng pricing từ API) ======
  const items = data.items || [];
  const subtotalFromItems = items.reduce((s, it) => {
    const qty = typeof it.qty === "number" ? it.qty : 1;
    const price = typeof it.price === "number" ? it.price : 0;
    const lineTotal = price * qty;
    return s + lineTotal;
  }, 0);

  const pricing = data.pricing || ({} as OrderDetailDTO["pricing"]);
  const subtotal = pricing.subtotal ?? subtotalFromItems;
  const discount = pricing.discountTotal ?? 0;
  const tax = pricing.taxTotal ?? Math.round(subtotal * 0.1);
  const shippingFee = pricing.shippingFee ?? data.shipping?.fee ?? 0;
  const grandTotal =
    pricing.grandTotal ?? subtotal - discount + tax + shippingFee;

  const customer = data.customer || { name: "" };

  const bankInfo = {
    bankId: "tpbank",
    accountName: "CÔNG TY TNHH AHSO",
    accountNumber: "03168969399",
    bankName: "TPBank – Chi nhánh Bình Chánh",
    transferNote: data.code,
  };

  const shippingAddress = data.shippingAddress ?? null;

  return (
    <div className="mx-auto max-w-7xl p-4 sm:p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/order"
            className="inline-flex items-center rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm hover:bg-gray-50"
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            Danh sách đơn
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">{data.code}</h1>
        </div>
        <span
          className={[
            "rounded-full px-3 py-1 text-xs font-medium ring-1",
            status === "delivered"
              ? "bg-green-50 text-green-700 ring-green-200"
              : status === "cancelled"
              ? "bg-rose-50 text-rose-700 ring-rose-200"
              : "bg-blue-50 text-blue-700 ring-blue-200",
          ].join(" ")}
        >
          {STATUS_LABEL[status]}
        </span>
      </div>

      {/* Meta */}
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-4">
          <div className="mb-2 flex items-center gap-2 text-sm text-gray-500">
            <Calendar className="h-4 w-4" />
            Ngày tạo
          </div>
          <div className="text-gray-900">
            {new Date(data.createdAt).toLocaleString("vi-VN")}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4">
          <div className="mb-2 flex items-center gap-2 text-sm text-gray-500">
            <CreditCard className="h-4 w-4" />
            Thanh toán
          </div>
          <div className="text-gray-900">
            {paymentMethodLabel(data.payment?.method)}
          </div>
          <div className="text-sm text-gray-500">
            Đã thu: {formatVND(data.payment?.paidAmount)}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4">
          <div className="mb-2 flex items-center gap-2 text-sm text-gray-500">
            <Truck className="h-4 w-4" />
            Vận chuyển
          </div>
          <div className="text-gray-900">
            {data.shipping?.method || "Chưa có phương thức"}
          </div>
          <div className="text-sm text-gray-500">
            Phí: {formatVND(shippingFee)}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left: Items + tiền */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl border border-gray-200 bg-white">
            <div className="border-b border-gray-100 p-4 font-medium">
              Sản phẩm
            </div>
            <div className="p-4">
              <div className="hidden grid-cols-12 gap-4 text-xs font-semibold text-gray-500 md:grid">
                <div className="col-span-5">Sản phẩm</div>
                <div className="col-span-2">Mã SKU</div>
                <div className="col-span-2 text-center">Số lượng</div>
                <div className="col-span-3 text-right">Thành tiền</div>
              </div>
              {items.map((it) => {
                const qty = typeof it.qty === "number" ? it.qty : 1;
                const price = typeof it.price === "number" ? it.price : 0;
                const lineTotal = price * qty;

                return (
                  <div
                    key={it.sku}
                    className="grid grid-cols-1 gap-2 border-t border-gray-100 py-3 md:grid-cols-12 md:items-center md:gap-4"
                  >
                    <div className="md:col-span-5 flex items-center gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={it.image || "/placeholder.png"}
                        alt={it.name}
                        className="h-12 w-12 rounded-lg border object-cover"
                      />
                      <div>
                        <div className="font-medium text-gray-900">
                          {it.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {formatVND(price)}
                        </div>
                      </div>
                    </div>
                    <div className="md:col-span-2 text-gray-700">
                      {it.sku}
                    </div>
                    <div className="md:col-span-2 text-center text-gray-700">
                      {qty}
                    </div>
                    <div className="md:col-span-3 text-right font-medium">
                      {formatVND(lineTotal)}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Summary tiền */}
            <div className="border-t border-gray-100 p-4">
              <div className="flex justify-end">
                <div className="w-full max-w-sm space-y-1 text-sm">
                  <div className="flex justify-between text-gray-600">
                    <span>Tạm tính</span>
                    <span>{formatVND(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Giảm giá</span>
                    <span>-{formatVND(discount)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>VAT (10%)</span>
                    <span>{formatVND(tax)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Phí vận chuyển</span>
                    <span>{formatVND(shippingFee)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2 text-base font-semibold text-gray-900">
                    <span>Tổng cộng</span>
                    <span>{formatVND(grandTotal)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {data.note ? (
            <div className="rounded-2xl border border-gray-200 bg-white p-4">
              <div className="mb-2 flex items-center gap-2 text-sm text-gray-500">
                <Receipt className="h-4 w-4" />
                Ghi chú
              </div>
              <div className="text-gray-900">{data.note}</div>
            </div>
          ) : null}

          {/* Hướng dẫn thanh toán chuyển khoản */}
          <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-blue-900">
              <CreditCard className="h-4 w-4" />
              Thông tin chuyển khoản
            </div>
            <div className="space-y-1 text-sm text-blue-900">
              <div>
                Ngân hàng:{" "}
                <span className="font-semibold">{bankInfo.bankName}</span>
              </div>
              <div>
                Chủ tài khoản:{" "}
                <span className="font-semibold">{bankInfo.accountName}</span>
              </div>
              <div>
                Số tài khoản:{" "}
                <span className="font-semibold">{bankInfo.accountNumber}</span>
              </div>
              <div>
                Nội dung chuyển khoản:{" "}
                <span className="font-semibold">{bankInfo.transferNote}</span>
              </div>
              <div className="mt-2 text-xs text-blue-800">
                Sau khi chuyển khoản, đơn hàng sẽ được xác nhận trong 1–2 giờ
                làm việc.
              </div>
            </div>
          </div>
        </div>

        {/* Right: Khách + địa chỉ + tracking */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-gray-200 bg-white p-4">
            <div className="mb-3 flex items-center gap-2 font-medium">
              <User className="h-4 w-4" />
              Khách hàng
            </div>
            <div className="space-y-1 text-sm">
              <div className="text-gray-900">{customer.name}</div>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-4">
            <div className="mb-3 flex items-center gap-2 font-medium">
              <MapPin className="h-4 w-4" />
              Địa chỉ giao hàng
            </div>
            {shippingAddress ? (
              <div className="text-sm text-gray-900">
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
              </div>
            ) : (
              <div className="text-sm text-gray-500">Chưa có địa chỉ.</div>
            )}
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-4">
            <div className="mb-3 flex items-center gap-2 font-medium">
              <Package className="h-4 w-4" />
              Mã đơn & Theo dõi
            </div>
            <div className="text-sm space-y-2">
              <div>
                Mã: <span className="font-medium">{data.code}</span>
              </div>
              <Link
                  href={`/order/${data.id}/print`}
                  className="inline-flex items-center rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium hover:bg-gray-50"
                >
                  In hóa đơn
                </Link>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
