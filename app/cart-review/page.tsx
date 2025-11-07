"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ShoppingCart, ArrowLeft, CheckCircle2 } from "lucide-react";

// Keep types in sync with Cart page
export type CartItem = {
  id: string; // variant id or SKU
  productId: string;
  name: string;
  variantLabel?: string;
  price: number; // unit price (VND)
  imgUrl?: string;
  slug: string;
  qty: number;
  stock?: number;
};

type GuestInfo = {
  fullName: string;
  email: string;
  phoneE164: string; // +84...
  taxCode?: string;

  // Shipping address
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  postalCode?: string;
  country: string; // ISO2 (e.g., "VN")

  // Optional note
  note?: string;
};

const VAT_RATE = 0.1; // 10%
const CART_KEY = "cart:v1";
const CHECKOUT_KEY = "checkout:guest";

const formatVND = (n: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(Math.max(0, Math.round(n)));

export default function CartReviewPage() {
  const router = useRouter();
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [agree, setAgree] = useState(false);
  const [invoice, setInvoice] = useState(false); // xuất hoá đơn công ty

  const [form, setForm] = useState<GuestInfo>({
    fullName: "",
    email: "",
    phoneE164: "",
    taxCode: "",
    line1: "",
    line2: "",
    city: "",
    state: "",
    postalCode: "",
    country: "VN",
    note: "",
  });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(CART_KEY);
      if (raw) setItems(JSON.parse(raw));
      const rawGuest = localStorage.getItem(CHECKOUT_KEY);
      if (rawGuest) setForm((f) => ({ ...f, ...(JSON.parse(rawGuest) as GuestInfo) }));
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(CHECKOUT_KEY, JSON.stringify(form));
    } catch {}
  }, [form]);

  const subtotal = useMemo(() => items.reduce((s, it) => s + it.price * it.qty, 0), [items]);
  const vat = useMemo(() => subtotal * VAT_RATE, [subtotal]);
  const shippingFee = 30000; // For demo; replace with selected method or API quote
  const grandTotal = useMemo(() => subtotal + vat + shippingFee, [subtotal, vat]);

  const onChange = (key: keyof GuestInfo) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [key]: e.target.value }));
  };

  const validate = (): string | null => {
    if (!form.fullName.trim()) return "Vui lòng nhập họ và tên.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return "Email không hợp lệ.";
    if (!/^\+?\d{8,15}$/.test(form.phoneE164)) return "Số điện thoại (E.164) không hợp lệ. Ví dụ: +84901234567";
    if (!form.line1.trim()) return "Vui lòng nhập địa chỉ nhận hàng.";
    if (!form.city.trim()) return "Vui lòng nhập tỉnh/thành phố.";
    if (!form.country.trim()) return "Vui lòng chọn quốc gia.";
    if (invoice && form.taxCode && !/^\d{10,13}$/.test(form.taxCode)) return "Mã số thuế 10–13 chữ số.";
    if (!agree) return "Bạn cần đồng ý điều khoản mua hàng.";
    if (items.length === 0) return "Giỏ hàng trống.";
    return null;
  };

  const handlePlaceOrder = async () => {
    const err = validate();
    if (err) {
      alert(err);
      return;
    }

    // Build payload for server
    const payload = {
      guest: form,
      items: items.map((i) => ({
        variantId: i.id,
        qty: i.qty,
        price: i.price,
      })),
      totals: { subtotal, vat, shippingFee, grandTotal },
      currency: "VND",
    };

    // TODO: POST to your API (uncomment and implement)
    // const res = await fetch("/api/checkout/guest", {
    //   method: "POST",
    //   headers: { "Content-Type": "application/json" },
    //   body: JSON.stringify(payload),
    // });
    // if (!res.ok) {
    //   const data = await res.json().catch(() => ({}));
    //   alert(data?.message || "Đặt hàng thất bại, vui lòng thử lại.");
    //   return;
    // }

    // Demo success
    alert("Đặt hàng thành công! (demo)");
    router.push("/thank-you");
  };

  if (loading) return null;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-6 lg:px-8">
      <div className="mb-6 flex items-center gap-2 text-lg font-semibold">
        <ShoppingCart className="h-5 w-5" /> Xem lại đơn hàng
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: Form */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Thông tin người nhận (không cần đăng nhập)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium">Họ và tên</label>
                <Input value={form.fullName} onChange={onChange("fullName")} placeholder="Nguyễn Văn A" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Email</label>
                <Input value={form.email} onChange={onChange("email")} placeholder="email@domain.com" type="email" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Số điện thoại (+84)</label>
                <Input value={form.phoneE164} onChange={onChange("phoneE164")} placeholder="+8490xxxxxxx" />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium">Địa chỉ</label>
                <Input value={form.line1} onChange={onChange("line1")} placeholder="Số nhà, đường" />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium">Địa chỉ (bổ sung)</label>
                <Input value={form.line2} onChange={onChange("line2")} placeholder="Phường/xã, toà nhà (tuỳ chọn)" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Tỉnh/Thành phố</label>
                <Input value={form.city} onChange={onChange("city")} placeholder="TP. Hồ Chí Minh" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Quận/Huyện</label>
                <Input value={form.state} onChange={onChange("state")} placeholder="Quận 1" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Mã bưu chính</label>
                <Input value={form.postalCode} onChange={onChange("postalCode")} placeholder="700000" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Quốc gia</label>
                <select
                  value={form.country}
                  onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}
                  className="w-full rounded-md border bg-background p-2 text-sm"
                >
                  <option value="VN">Việt Nam</option>
                  <option value="SG">Singapore</option>
                  <option value="TH">Thailand</option>
                </select>
              </div>
            </div>

            <div className="grid gap-4">
              <label className="inline-flex items-center gap-2 text-sm">
                <input type="checkbox" checked={invoice} onChange={(e) => setInvoice(e.target.checked)} />
                Xuất hoá đơn công ty
              </label>
              {invoice && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium">Mã số thuế</label>
                    <Input value={form.taxCode} onChange={onChange("taxCode")} placeholder="10–13 chữ số" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-sm font-medium">Ghi chú</label>
                    <textarea
                      className="min-h-[90px] w-full rounded-md border bg-background p-2 text-sm"
                      placeholder="Yêu cầu xuất hoá đơn, ghi chú giao hàng, ..."
                      value={form.note}
                      onChange={onChange("note")}
                    />
                  </div>
                </div>
              )}
            </div>

            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
              Tôi đã đọc và đồng ý với điều khoản mua hàng & chính sách bảo mật.
            </label>
          </CardContent>
          <CardFooter className="flex items-center justify-between">
            <Button variant="outline" onClick={() => router.push("/cart")}> <ArrowLeft className="mr-2 h-4 w-4"/> Quay lại giỏ hàng</Button>
            <Button onClick={handlePlaceOrder} disabled={!agree || items.length === 0}> <CheckCircle2 className="mr-2 h-4 w-4"/> Đặt hàng</Button>
          </CardFooter>
        </Card>

        {/* Right: Order summary */}
        <Card>
          <CardHeader>
            <CardTitle>Đơn hàng của bạn</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {items.length === 0 ? (
              <div className="text-sm text-muted-foreground">Giỏ hàng trống. <Link href="/" className="underline">Mua sắm ngay</Link></div>
            ) : (
              <div className="space-y-3">
                {items.map((it) => (
                  <div key={it.id} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="relative h-12 w-12 overflow-hidden rounded border bg-white">
                        <Image src={it.imgUrl || "/placeholder.png"} alt={it.name} fill className="object-contain p-1" />
                      </div>
                      <div>
                        <div className="line-clamp-1 text-sm font-medium">{it.name}</div>
                        <div className="text-xs text-muted-foreground">{it.variantLabel} × {it.qty}</div>
                      </div>
                    </div>
                    <div className="whitespace-nowrap text-sm font-medium">{formatVND(it.price * it.qty)}</div>
                  </div>
                ))}
              </div>
            )}

            <hr />
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between"><span>Tạm tính</span><span className="font-medium">{formatVND(subtotal)}</span></div>
              <div className="flex items-center justify-between"><span>VAT (10%)</span><span className="font-medium">{formatVND(vat)}</span></div>
              <div className="flex items-center justify-between"><span>Vận chuyển</span><span className="font-medium">{formatVND(shippingFee)}</span></div>
              <hr />
              <div className="flex items-center justify-between text-base"><span className="font-semibold">Tổng cộng</span><span className="text-lg font-bold">{formatVND(grandTotal)}</span></div>
              <div className="text-xs text-muted-foreground">Đã bao gồm VAT.</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}