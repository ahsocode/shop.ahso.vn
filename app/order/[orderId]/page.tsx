// app/order/[orderId]/page.tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { Package, User, ChevronLeft, MapPin, CreditCard, Truck, Calendar, Receipt } from "lucide-react";
import type { OrderDetailDTO } from "../../../dto/order.dto";

function formatVND(n: number) {
  return n.toLocaleString("vi-VN") + " ₫";
}

async function getOrder(orderId: string): Promise<OrderDetailDTO | null> {
  try {
    const base = process.env.NEXT_PUBLIC_BASE_URL ?? "";
    const r = await fetch(`${base}/api/orders/${orderId}`, { cache: "no-store" });
    if (!r.ok) throw new Error("no api");
    return (await r.json()) as OrderDetailDTO;
  } catch {
    // mock (nếu chưa có API)
    if (!/^\d+$/.test(orderId)) return null;
    return {
      id: orderId,
      code: `#AHSO-${orderId}`,
      createdAt: new Date().toISOString(),
      status: "processing",
      customer: { name: "Nguyễn Văn A", phone: "0912345678", email: "a@example.com" },
      shippingAddress: {
        line1: "123 Nguyễn Trãi",
        city: "Q.1",
        district: "Bến Thành",
        province: "TP.HCM",
      },
      payment: { method: "vnpay", paidAmount: 278900 },
      shipping: { method: "GHTK", fee: 30000 },
      items: [
        { sku: "SKU-001", name: "Bộ vòng bi công nghiệp", qty: 2, price: 99000 },
        { sku: "SKU-002", name: "Ống thủy lực HD", qty: 1, price: 80900 },
      ],
      note: "Giao giờ hành chính.",
    };
  }
}

const STATUS_LABEL: Record<NonNullable<OrderDetailDTO["status"]>, string> = {
  pending: "Chờ thanh toán",
  paid: "Đã thanh toán",
  processing: "Đang xử lý",
  shipped: "Đã gửi hàng",
  delivered: "Đã giao",
  cancelled: "Đã hủy",
};

export default async function OrderDetailPage({ params }: { params: { orderId: string } }) {
  const data = await getOrder(params.orderId);
  if (!data) return notFound();

  const subtotal = data.items.reduce((s, i) => s + i.price * i.qty, 0);
  const grandTotal = subtotal + (data.shipping?.fee ?? 0);

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
            data.status === "delivered"
              ? "bg-green-50 text-green-700 ring-green-200"
              : data.status === "cancelled"
              ? "bg-rose-50 text-rose-700 ring-rose-200"
              : "bg-blue-50 text-blue-700 ring-blue-200",
          ].join(" ")}
        >
          {STATUS_LABEL[data.status]}
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
          <div className="text-gray-900 capitalize">{data.payment.method}</div>
          <div className="text-sm text-gray-500">Đã thu: {formatVND(data.payment.paidAmount)}</div>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4">
          <div className="mb-2 flex items-center gap-2 text-sm text-gray-500">
            <Truck className="h-4 w-4" />
            Vận chuyển
          </div>
          <div className="text-gray-900">{data.shipping.method}</div>
          <div className="text-sm text-gray-500">Phí: {formatVND(data.shipping.fee)}</div>
        </div>
      </div>

      {/* Body */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left: Items */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl border border-gray-200 bg-white">
            <div className="border-b border-gray-100 p-4 font-medium">Sản phẩm</div>
            <div className="p-4">
              <div className="hidden grid-cols-12 gap-4 text-xs font-semibold text-gray-500 md:grid">
                <div className="col-span-5">Sản phẩm</div>
                <div className="col-span-2">Mã SKU</div>
                <div className="col-span-2 text-center">Số lượng</div>
                <div className="col-span-3 text-right">Thành tiền</div>
              </div>
              {data.items.map((it) => (
                <div key={it.sku} className="grid grid-cols-1 gap-2 border-t border-gray-100 py-3 md:grid-cols-12 md:items-center md:gap-4">
                  <div className="md:col-span-5 flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={it.image || "/placeholder.png"}
                      alt={it.name}
                      className="h-12 w-12 rounded-lg border object-cover"
                    />
                    <div>
                      <div className="font-medium text-gray-900">{it.name}</div>
                      <div className="text-sm text-gray-500">{formatVND(it.price)}</div>
                    </div>
                  </div>
                  <div className="md:col-span-2 text-gray-700">{it.sku}</div>
                  <div className="md:col-span-2 text-center text-gray-700">{it.qty}</div>
                  <div className="md:col-span-3 text-right font-medium">
                    {formatVND(it.price * it.qty)}
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-gray-100 p-4">
              <div className="flex justify-end">
                <div className="w-full max-w-sm space-y-1 text-sm">
                  <div className="flex justify-between text-gray-600">
                    <span>Tạm tính</span>
                    <span>{formatVND(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Phí vận chuyển</span>
                    <span>{formatVND(data.shipping.fee)}</span>
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
        </div>

        {/* Right: Customer / Shipping */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-gray-200 bg-white p-4">
            <div className="mb-3 flex items-center gap-2 font-medium">
              <User className="h-4 w-4" />
              Khách hàng
            </div>
            <div className="space-y-1 text-sm">
              <div className="text-gray-900">{data.customer.name}</div>
              {data.customer.phone && <div className="text-gray-600">{data.customer.phone}</div>}
              {data.customer.email && (
                <Link className="text-blue-600 hover:underline" href={`mailto:${data.customer.email}`}>
                  {data.customer.email}
                </Link>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-4">
            <div className="mb-3 flex items-center gap-2 font-medium">
              <MapPin className="h-4 w-4" />
              Địa chỉ giao hàng
            </div>
            {data.shippingAddress ? (
              <div className="text-sm text-gray-900">
                <div>{data.shippingAddress.line1}</div>
                {data.shippingAddress.line2 && <div>{data.shippingAddress.line2}</div>}
                <div>
                  {data.shippingAddress.district ? `${data.shippingAddress.district}, ` : ""}
                  {data.shippingAddress.city}
                  {data.shippingAddress.province ? `, ${data.shippingAddress.province}` : ""}
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
            <div className="text-sm">
              <div className="mb-2">
                Mã: <span className="font-medium">{data.code}</span>
              </div>
              <Link
                href={`/order/${data.id}?print=1`}
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

// (tuỳ chọn) SEO: nếu muốn generateMetadata thì import DTO SEO riêng
