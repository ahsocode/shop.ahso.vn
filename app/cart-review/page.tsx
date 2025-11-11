"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ShoppingCart,
  ArrowLeft,
  CheckCircle2,
  Mail,
  Phone,
  MapPin,
  FileText,
  Package,
  CreditCard,
  BadgePercent,
  Banknote,
} from "lucide-react";

/* ================== Types ================== */
export type CartItem = {
  id: string;
  productId?: string;
  name: string;
  variantLabel?: string;
  price: number;
  imgUrl?: string;
  slug: string;
  qty: number;
  stock?: number;
  sku?: string;
};

type GuestInfo = {
  fullName: string;
  email: string;
  phoneE164: string;
  taxCode?: string | null;
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  postalCode?: string;
  country: string;
  note?: string;
};

type Profile = {
  id: string;
  fullName: string | null;
  email: string;
  phoneE164: string | null;
  taxCode?: string | null;
  shippingAddress?: {
    id: string;
    line1: string;
    line2?: string | null;
    city: string;
    state?: string | null;
    postalCode?: string | null;
    country: string;
  } | null;
};

/* ================== Consts & helpers ================== */
const VAT_RATE = 0.1;
const CHECKOUT_KEY = "checkout:guest";

const PROMOS: Record<
  string,
  | { kind: "percent"; value: number }
  | { kind: "fixed"; value: number }
  | { kind: "shipping_free" }
> = {
  GIAM10: { kind: "percent", value: 10 },
  GIAM50K: { kind: "fixed", value: 50000 },
  FREESHIP: { kind: "shipping_free" },
};

const formatVND = (n: number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Math.max(0, Math.round(n)));

/* =================================================================== */
/* =============================== PAGE =============================== */
/* =================================================================== */
export default function CartReviewPage() {
  const router = useRouter();

  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [profileLoaded, setProfileLoaded] = useState(false);

  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);

  // payment / coupon / note
  const [paymentType, setPaymentType] = useState<"cod" | "bank" | "online">("cod");
  const [paymentMethod, setPaymentMethod] = useState<string>("");
  const [promoInput, setPromoInput] = useState("");
  const [appliedCode, setAppliedCode] = useState<string | null>(null);
  const [noteLeft, setNoteLeft] = useState("");

  // shipping form
  const [agree, setAgree] = useState(false);
  const [invoice, setInvoice] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
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

  /* ====== Load profile (prefill) + cart ====== */
  useEffect(() => {
    // Prefill từ localStorage (guest) trước
    try {
      const rawGuest = localStorage.getItem(CHECKOUT_KEY);
      if (rawGuest) setForm((f) => ({ ...f, ...(JSON.parse(rawGuest) as GuestInfo) }));
    } catch {}

    // Cart
    (async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/cart", { cache: "no-store", credentials: "include" });
        if (!res.ok) {
          setItems([]);
        } else {
          const data = await res.json();
          const cart = (data?.cart ?? data) as any;
          const rawItems: any[] = cart?.items ?? [];
          const mapped: CartItem[] = rawItems.map((it) => ({
            id: it.id,
            productId: it.productId ?? undefined,
            name: it.productName ?? it.variantSku ?? "",
            variantLabel: undefined,
            price: Number(it.unitPrice || 0),
            imgUrl: it.productImage || undefined,
            slug: it.productSlug || "",
            qty: Number(it.quantity || 1),
            stock: typeof it?.product?.stockOnHand === "number" ? it.product.stockOnHand : undefined,
            sku: it.productSku || undefined,
          }));
          setItems(mapped);
        }
      } finally {
        setLoading(false);
      }
    })();

    // Profile
    (async () => {
      try {
        const r = await fetch("/api/profile", { credentials: "include" });
        if (!r.ok) {
          setIsLoggedIn(false);
          setProfileLoaded(true);
          return;
        }
        const { profile }: { profile: Profile } = await r.json();
        setIsLoggedIn(true);
        setForm((f) => ({
          ...f,
          fullName: profile.fullName ?? f.fullName,
          email: profile.email ?? f.email,
          phoneE164: profile.phoneE164 ?? f.phoneE164,
          taxCode: profile.taxCode ?? f.taxCode,
          line1: profile.shippingAddress?.line1 ?? f.line1,
          line2: profile.shippingAddress?.line2 ?? f.line2,
          city: profile.shippingAddress?.city ?? f.city,
          state: profile.shippingAddress?.state ?? f.state,
          postalCode: profile.shippingAddress?.postalCode ?? f.postalCode,
          country: profile.shippingAddress?.country ?? f.country ?? "VN",
        }));
        setProfileLoaded(true);
      } catch {
        setIsLoggedIn(false);
        setProfileLoaded(true);
      }
    })();
  }, []);

  // Persist guest info
  useEffect(() => {
    try {
      localStorage.setItem(CHECKOUT_KEY, JSON.stringify(form));
    } catch {}
  }, [form]);

  /* ======= totals ======= */
  const subtotal = useMemo(() => items.reduce((s, it) => s + it.price * it.qty, 0), [items]);

  const discount = useMemo(() => {
    if (!appliedCode) return 0;
    const d = PROMOS[appliedCode];
    if (!d) return 0;
    if (d.kind === "percent") return (subtotal * d.value) / 100;
    if (d.kind === "fixed") return Math.min(subtotal, d.value);
    return 0;
  }, [appliedCode, subtotal]);

  const taxable = Math.max(0, subtotal - discount);
  const vat = useMemo(() => taxable * VAT_RATE, [taxable]);

  const shippingFee = useMemo(() => {
    if (items.length === 0) return 0;
    const free = appliedCode && PROMOS[appliedCode]?.kind === "shipping_free";
    return free ? 0 : 30000;
  }, [items.length, appliedCode]);

  const grandTotal = useMemo(() => taxable + vat + shippingFee, [taxable, vat, shippingFee]);

  /* ======= handlers ======= */
  const onChange = (key: keyof GuestInfo) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setForm((prev) => ({ ...prev, [key]: e.target.value }));
    setErrors((prev) => ({ ...prev, [key]: "" }));
  };

  const applyPromo = () => {
    const code = promoInput.trim().toUpperCase();
    if (!code) return;
    if (!PROMOS[code]) {
      setErrors((e) => ({ ...e, promo: "Mã giảm giá không hợp lệ" }));
      return;
    }
    setAppliedCode(code);
    setErrors((e) => {
      const { promo, ...rest } = e;
      return rest;
    });
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!agree) newErrors.agree = "Bạn cần đồng ý điều khoản";
    if (items.length === 0) newErrors.items = "Giỏ hàng trống";

    // Dù đăng nhập hay không, vẫn xác thực các trường cần thiết để tránh lỗi vận chuyển
    if (!form.fullName.trim()) newErrors.fullName = "Vui lòng nhập họ và tên";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) newErrors.email = "Email không hợp lệ";
    if (!/^\+?\d{8,15}$/.test(form.phoneE164))
      newErrors.phoneE164 = "Số điện thoại không hợp lệ";
    if (!form.line1.trim()) newErrors.line1 = "Vui lòng nhập địa chỉ";
    if (!form.city.trim()) newErrors.city = "Vui lòng nhập tỉnh/thành phố";
    if (invoice && form.taxCode && !/^\d{10,13}$/.test(form.taxCode))
      newErrors.taxCode = "Mã số thuế 10–13 chữ số";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePlaceOrder = async () => {
    if (!validate()) return;
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          guest: form, // nếu backend của bạn cho phép addressId khi login, bổ sung ở đây
          paymentType,
          paymentMethod,
          coupon: appliedCode,
          note: noteLeft,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Đặt hàng thất bại");
      }
      sessionStorage.setItem("orderPreview", JSON.stringify(data.orderPreview));
      router.push("/thank-you");
    } catch (e: any) {
      alert(e?.message || "Không thể đặt hàng. Vui lòng thử lại.");
    }
  };

  if (loading || !profileLoaded) return null;

  /* ================== UI ================== */
  return (
    <div className="min-h-screen bg-linear-to-br from-gray-50 to-blue-50">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-blue-600 p-3">
              <ShoppingCart className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Xác nhận đơn hàng</h1>
              <p className="text-sm text-gray-600">Kiểm tra thông tin và hoàn tất đặt hàng</p>
            </div>
          </div>
          <button
            onClick={() => router.push("/cart")}
            className="hidden sm:flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm font-medium hover:bg-gray-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Quay lại giỏ hàng
          </button>
        </div>

        {/* Layout */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* LEFT */}
          <div className="lg:col-span-2 space-y-6">
            {/* Product list */}
            <div className="rounded-2xl border bg-white p-4 sm:p-6 shadow-sm">
              <div className="mb-4 flex items-center gap-3">
                <div className="rounded-lg bg-orange-100 p-2">
                  <Package className="h-5 w-5 text-orange-600" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900">Danh sách sản phẩm</h2>
              </div>

              {items.length === 0 ? (
                <div className="rounded-lg bg-gray-50 p-4 text-center text-sm text-gray-600">
                  Giỏ hàng trống
                </div>
              ) : (
                <div className="space-y-3">
                  {items.map((it) => (
                    <div key={it.id} className="flex gap-3 rounded-lg border p-3">
                      <div className="relative h-14 w-14 sm:h-16 sm:w-16 shrink-0 overflow-hidden rounded-md bg-gray-100">
                        <img
                          src={it.imgUrl || "/logo.png"}
                          alt={it.name}
                          className="h-full w-full object-contain p-1"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="line-clamp-2 text-sm font-medium text-gray-900">
                          {it.name}
                        </h3>
                        <p className="text-xs text-gray-600">
                          {it.variantLabel ?? (it.sku ? `SKU: ${it.sku}` : "")} × {it.qty}
                        </p>
                        <p className="mt-1 text-sm font-semibold text-gray-900">
                          {formatVND(it.price * it.qty)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Shipping / Customer info (PROFILE) */}
            <ShippingFromProfile
              isLoggedIn={isLoggedIn}
              form={form}
              setForm={setForm}
              errors={errors}
              setErrors={setErrors}
              invoice={invoice}
              setInvoice={setInvoice}
              agree={agree}
              setAgree={setAgree}
              onChange={onChange}
            />

            {/* Payment + coupon + note */}
            <div className="rounded-2xl border bg-white p-4 sm:p-6 shadow-sm">
              <div className="mb-4 flex items-center gap-3">
                <div className="rounded-lg bg-blue-100 p-2">
                  <Banknote className="h-5 w-5 text-blue-600" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900">Thanh toán & Khuyến mãi</h2>
              </div>

              {/* Payment type */}
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  { id: "cod", label: "Thanh toán khi nhận (COD)" },
                  { id: "bank", label: "Chuyển khoản ngân hàng" },
                  { id: "online", label: "Online (Momo/VNPay)" },
                ].map((opt) => (
                  <label
                    key={opt.id}
                    className={`flex cursor-pointer items-center gap-2 rounded-lg border p-3 text-sm ${
                      paymentType === opt.id ? "border-blue-500 bg-blue-50" : "border-gray-300 bg-white"
                    }`}
                  >
                    <input
                      type="radio"
                      name="payment-type"
                      checked={paymentType === (opt.id as any)}
                      onChange={() => setPaymentType(opt.id as "cod" | "bank" | "online")}
                      className="h-4 w-4 text-blue-600"
                    />
                    {opt.label}
                  </label>
                ))}
              </div>

              {(paymentType === "bank" || paymentType === "online") && (
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  {(
                    paymentType === "bank"
                      ? ["Vietcombank", "Techcombank", "MB Bank"]
                      : ["Momo", "VNPay", "ZaloPay"]
                  ).map((m) => (
                    <label
                      key={m}
                      className={`flex cursor-pointer items-center gap-2 rounded-lg border p-3 text-sm ${
                        paymentMethod === m ? "border-blue-500 bg-blue-50" : "border-gray-300 bg-white"
                      }`}
                    >
                      <input
                        type="radio"
                        name="payment-method"
                        checked={paymentMethod === m}
                        onChange={() => setPaymentMethod(m)}
                        className="h-4 w-4 text-blue-600"
                      />
                      {m}
                    </label>
                  ))}
                </div>
              )}

              {/* Coupon */}
              <div className="mt-6">
                <label className="mb-2 block text-sm font-medium text-gray-700">Mã khuyến mãi</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <BadgePercent className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                    <input
                      id="promo"
                      value={promoInput}
                      onChange={(e) => setPromoInput(e.target.value)}
                      placeholder="GIAM10, GIAM50K, FREESHIP"
                      className="w-full rounded-lg border border-gray-300 py-3 pl-11 pr-4 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={applyPromo}
                    className="rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700"
                  >
                    Áp dụng
                  </button>
                </div>
                {appliedCode && (
                  <p className="mt-2 text-sm text-green-600">
                    Đã áp dụng: <b>{appliedCode}</b>
                  </p>
                )}
                {errors.promo && <p className="mt-2 text-sm text-red-600">{errors.promo}</p>}
              </div>

              {/* Note */}
              <div className="mt-6">
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Ghi chú đơn hàng
                </label>
                <textarea
                  rows={3}
                  value={noteLeft}
                  onChange={(e) => setNoteLeft(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  placeholder="Yêu cầu đóng gói, giao giờ hành chính..."
                />
              </div>
            </div>
          </div>

          {/* RIGHT: Summary only (sticky) */}
          <aside className="lg:col-span-1">
            <div className="lg:sticky lg:top-24">
              <div className="rounded-2xl border bg-white p-4 sm:p-6 shadow-sm">
                <h2 className="mb-4 text-lg font-semibold text-gray-900">Tóm tắt đơn hàng</h2>

                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Tạm tính</span>
                    <span className="font-medium">{formatVND(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Giảm giá</span>
                    <span className="font-medium">-{formatVND(discount)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">VAT (10%)</span>
                    <span className="font-medium">{formatVND(vat)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Vận chuyển</span>
                    <span className="font-medium">{formatVND(shippingFee)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-3 text-base">
                    <span className="font-semibold text-gray-900">Tổng cộng</span>
                    <span className="text-xl font-bold text-blue-600">{formatVND(grandTotal)}</span>
                  </div>
                  <p className="text-xs text-gray-500">Đã bao gồm VAT</p>
                </div>

                <button
                  onClick={handlePlaceOrder}
                  disabled={!agree || items.length === 0}
                  className="group relative overflow-hidden mt-4 w-full rounded-xl bg-linear-to-r from-blue-600 to-blue-700 px-6 py-4 font-semibold text-white shadow-lg transition-all hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    <CheckCircle2 className="h-5 w-5" />
                    Đặt hàng ngay
                  </span>
                  <div className="pointer-events-none absolute inset-0 bg-linear-to-r from-blue-700 to-blue-800 opacity-0 transition-opacity group-hover:opacity-100" />
                </button>

                <div className="mt-4 rounded-xl border border-green-200 bg-green-50 p-4">
                  <div className="flex items-start gap-3">
                    <div className="rounded-lg bg-green-100 p-2">
                      <CreditCard className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-green-900">Thanh toán an toàn</h3>
                      <p className="mt-1 text-xs text-green-700">
                        Thông tin của bạn được mã hóa và bảo mật
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>

        {/* Mobile CTA */}
        <div className="lg:hidden fixed inset-x-0 bottom-0 z-40 border-t bg-white/90 backdrop-blur">
          <div className="mx-auto max-w-7xl px-4 py-3 flex items-center gap-3">
            <div className="flex-1">
              <div className="text-xs text-gray-600">Tổng cộng</div>
              <div className="text-lg font-bold text-blue-600">{formatVND(grandTotal)}</div>
            </div>
            <button
              onClick={handlePlaceOrder}
              disabled={!agree || items.length === 0}
              className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
            >
              Đặt hàng ngay
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* =================================================================== */
/* =============== BLOCK: Shipping Form (dùng /api/profile) ========== */
/* =================================================================== */
function ShippingFromProfile({
  isLoggedIn,
  form,
  setForm,
  errors,
  setErrors,
  invoice,
  setInvoice,
  agree,
  setAgree,
  onChange,
}: {
  isLoggedIn: boolean;
  form: GuestInfo;
  setForm: React.Dispatch<React.SetStateAction<GuestInfo>>;
  errors: Record<string, string>;
  setErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  invoice: boolean;
  setInvoice: (v: boolean) => void;
  agree: boolean;
  setAgree: (v: boolean) => void;
  onChange: (k: keyof GuestInfo) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
}) {
  const [mode, setMode] = useState<"view" | "edit">(isLoggedIn ? "view" : "edit");
  const readOnly = isLoggedIn && mode === "view";

  async function saveProfile() {
    try {
      const r = await fetch("/api/profile", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: form.fullName,
          phone: form.phoneE164,            // backend tự chuẩn hóa E.164
          taxCode: form.taxCode || null,
          shippingAddress: {
            line1: form.line1,
            line2: form.line2 || undefined,
            city: form.city,
            state: form.state || undefined,
            postalCode: form.postalCode || undefined,
            country: (form.country || "VN").toUpperCase(),
          },
          // billingAddress: null => dùng chung shipping (đúng theo logic backend của bạn)
        }),
      });
      if (!r.ok) throw 0;
      setMode("view");
    } catch {
      alert("Không thể lưu hồ sơ. Vui lòng thử lại.");
    }
  }

  return (
    <div className="rounded-2xl border bg-white p-4 sm:p-6 shadow-sm">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-green-100 p-2">
            <MapPin className="h-5 w-5 text-green-600" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">Thông tin giao hàng</h2>
        </div>

        {isLoggedIn && (
          <div className="flex items-center gap-2">
            {mode === "view" ? (
              <button
                onClick={() => setMode("edit")}
                className="text-sm rounded-md border px-3 py-1.5 hover:bg-gray-50"
              >
                Sửa thông tin
              </button>
            ) : (
              <>
                <button
                  onClick={saveProfile}
                  className="text-sm rounded-md bg-blue-600 text-white px-3 py-1.5 hover:bg-blue-700"
                >
                  Lưu
                </button>
                <button
                  onClick={() => setMode("view")}
                  className="text-sm rounded-md border px-3 py-1.5 hover:bg-gray-50"
                >
                  Hủy
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Form */}
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField id="fullName" label="Họ và tên" required value={form.fullName} onChange={onChange("fullName")} error={errors.fullName} className="sm:col-span-2" readOnly={readOnly} />
        <IconField id="email" label="Email" icon={<Mail className="h-5 w-5 text-gray-400" />} required value={form.email} onChange={onChange("email")} error={errors.email} readOnly />
        <IconField id="phoneE164" label="Số điện thoại" icon={<Phone className="h-5 w-5 text-gray-400" />} required value={form.phoneE164} onChange={onChange("phoneE164")} error={errors.phoneE164} readOnly={readOnly} />
        <TextField id="line1" label="Địa chỉ" required value={form.line1} onChange={onChange("line1")} error={errors.line1} className="sm:col-span-2" readOnly={readOnly} />
        <TextField id="line2" label="Địa chỉ bổ sung" value={form.line2 ?? ""} onChange={onChange("line2")} className="sm:col-span-2" readOnly={readOnly} />
        <TextField id="city" label="Tỉnh/Thành phố" required value={form.city} onChange={onChange("city")} error={errors.city} readOnly={readOnly} />
        <TextField id="state" label="Quận/Huyện" value={form.state ?? ""} onChange={onChange("state")} readOnly={readOnly} />
      </div>

      {/* Hóa đơn */}
      <div className="mt-6 rounded-2xl border bg-white">
        <div className="p-6">
          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-lg bg-purple-100 p-2">
              <FileText className="h-5 w-5 text-purple-600" />
            </div>
            <h3 className="text-base font-semibold text-gray-900">Thông tin hóa đơn</h3>
          </div>

          <label className="mb-4 flex cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              checked={invoice}
              onChange={(e) => setInvoice(e.target.checked)}
              className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-gray-700">Xuất hóa đơn công ty</span>
          </label>

          {invoice && (
            <div className="space-y-4 rounded-lg bg-gray-50 p-4">
              <TextField id="taxCode" label="Mã số thuế" required value={form.taxCode ?? ""} onChange={onChange("taxCode")} error={errors.taxCode} readOnly={readOnly} />
            </div>
          )}
        </div>
      </div>

      {/* Điều khoản */}
      <div className="mt-6 rounded-2xl border bg-white p-4 sm:p-6 shadow-sm">
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={agree}
            onChange={(e) => setAgree(e.target.checked)}
            className="mt-1 h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-700">
            Tôi đã đọc và đồng ý với{" "}
            <a href="#" className="font-medium text-blue-600 hover:underline">
              điều khoản mua hàng
            </a>{" "}
            và{" "}
            <a href="#" className="font-medium text-blue-600 hover:underline">
              chính sách bảo mật
            </a>
            .
          </span>
        </label>
      </div>
    </div>
  );
}

/* =================================================================== */
/* ============================= Inputs ============================== */
/* =================================================================== */
function TextField({
  id,
  label,
  value,
  onChange,
  required,
  error,
  className,
  readOnly,
}: {
  id: string;
  label: string;
  value: string;
  onChange: any;
  required?: boolean;
  error?: string;
  className?: string;
  readOnly?: boolean;
}) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-2 block text-sm font-medium text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        id={id}
        type="text"
        value={value}
        onChange={onChange}
        readOnly={readOnly}
        className={`w-full rounded-lg border px-4 py-3 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200
          ${error ? "border-red-500" : "border-gray-300"} ${readOnly ? "bg-gray-50 text-gray-700" : "bg-white"}`}
        placeholder=""
      />
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}

function IconField({
  id,
  label,
  value,
  onChange,
  required,
  error,
  icon,
  readOnly,
}: {
  id: string;
  label: string;
  value: string;
  onChange: any;
  required?: boolean;
  error?: string;
  icon: React.ReactNode;
  readOnly?: boolean;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-medium text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2">{icon}</span>
        <input
          id={id}
          type="text"
          value={value}
          onChange={onChange}
          readOnly={readOnly}
          className={`w-full rounded-lg border py-3 pl-11 pr-4 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200
            ${error ? "border-red-500" : "border-gray-300"} ${readOnly ? "bg-gray-50 text-gray-700" : "bg-white"}`}
        />
      </div>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}
