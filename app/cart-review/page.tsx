"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type {
  ChangeEvent,
  ChangeEventHandler,
  Dispatch,
  ReactNode,
  SetStateAction,
} from "react";
import Image from "next/image";
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

  // Shipping address
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  postalCode?: string;
  country: string;
  note?: string;

  // Billing address (optional, khi xuất hoá đơn)
  useSeparateBilling?: boolean;
  billingLine1?: string;
  billingLine2?: string;
  billingCity?: string;
  billingState?: string;
  billingPostalCode?: string;
  billingCountry?: string;
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

type CartApiItem = {
  id: string;
  productId?: string | null;
  productName?: string | null;
  variantSku?: string | null;
  unitPrice?: number | string | null;
  productImage?: string | null;
  productSlug?: string | null;
  quantity?: number | string | null;
  product?: {
    stockOnHand?: number | null;
  } | null;
  productSku?: string | null;
};

type CartApiResponse = {
  cart?: { items?: CartApiItem[] | null } | null;
  items?: CartApiItem[] | null;
};

type CheckoutResponse = {
  ok?: boolean;
  orderPreview?: unknown;
  error?: string;
};

/* ================== Consts & helpers ================== */
const VAT_RATE = 0.1;
const CHECKOUT_KEY = "checkout:guest";
const SELECTED_KEY = "cart:selected:v1";


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
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<CartItem[]>([]);
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);

  // payment / coupon / note
  const [paymentType] = useState<"cod" | "bank" | "online">("cod");
  const [paymentMethod] = useState<string>("bank_transfer_qr");

  const [promoInput, setPromoInput] = useState("");
  const [appliedCode, setAppliedCode] = useState<string | null>(null);
  // TODO(promo): promoRef sẽ lưu thông tin chương trình khuyến mãi mở rộng
  const promoRef = useRef<string | null>(null);
  const [noteLeft, setNoteLeft] = useState("");

  // shipping + billing form
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
    useSeparateBilling: false,
    billingLine1: "",
    billingLine2: "",
    billingCity: "",
    billingState: "",
    billingPostalCode: "",
    billingCountry: "VN",
  });

  /* ====== Load profile (prefill) + cart ====== */
  useEffect(() => {
    // Prefill từ localStorage (guest) trước
    // Load selected items từ localStorage
    try {
      const rawSel = localStorage.getItem(SELECTED_KEY);
      if (rawSel) {
        const ids = JSON.parse(rawSel);
        if (Array.isArray(ids)) {
          setSelectedItemIds(ids);
        }
      }
    } catch {}

    // Cart
    (async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/cart", { cache: "no-store", credentials: "include" });
        if (!res.ok) {
          setItems([]);
        } else {
          const data: CartApiResponse = await res.json();
          const cartItemsCandidate = Array.isArray(data.items) ? data.items : data.cart?.items;
          const rawItems: CartApiItem[] = Array.isArray(cartItemsCandidate) ? cartItemsCandidate : [];
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
          // billingCountry mặc định theo country
          billingCountry: f.billingCountry ?? profile.shippingAddress?.country ?? "VN",
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

  const visibleItems = useMemo(
    () =>
      selectedItemIds.length > 0
        ? items.filter((it) => selectedItemIds.includes(it.id))
        : [],
    [items, selectedItemIds],
  );
  const subtotal = useMemo(
    () => visibleItems.reduce((s, it) => s + it.price * it.qty, 0),
    [visibleItems],
  );

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
    if (visibleItems.length === 0) return 0;
    const free = appliedCode && PROMOS[appliedCode]?.kind === "shipping_free";
    return free ? 0 : 30000;
  }, [appliedCode, visibleItems.length]);

  const grandTotal = useMemo(
    () => taxable + vat + shippingFee,
    [taxable, vat, shippingFee],
  );

  /* ======= handlers ======= */
  const onChange =
    (key: keyof GuestInfo) =>
    (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value = e.target.value;
      setForm((prev) => ({ ...prev, [key]: value }));
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
    promoRef.current = code;
    setErrors((e) => {
      const { promo, ...rest } = e;
      return rest;
    });
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!agree) newErrors.agree = "Bạn cần đồng ý với điều khoản";
    if (items.length === 0) newErrors.items = "Giỏ hàng trống";

    // Dù đăng nhập hay không vẫn kiểm tra các trường bắt buộc để giao hàng
    if (!form.fullName.trim()) newErrors.fullName = "Vui lòng nhập họ và tên";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) newErrors.email = "Email không hợp lệ";
    if (!/^\+?\d{8,15}$/.test(form.phoneE164))
      newErrors.phoneE164 = "Số điện thoại không hợp lệ";
    if (!form.line1.trim()) newErrors.line1 = "Vui lòng nhập địa chỉ";
    if (!form.city.trim()) newErrors.city = "Vui lòng nhập tỉnh/thành phố";

    if (invoice && form.taxCode && !/^\d{10,13}$/.test(form.taxCode))
      newErrors.taxCode = "Mã số thuế phải gồm 10–13 chữ số";

    // Nếu xuất hoá đơn và dùng địa chỉ hoá đơn riêng -> validate billing
    if (invoice && form.useSeparateBilling) {
      if (!form.billingLine1?.trim())
        newErrors.billingLine1 = "Vui lòng nhập địa chỉ hoá đơn";
      if (!form.billingCity?.trim())
        newErrors.billingCity = "Vui lòng nhập tỉnh/thành phố hoá đơn";
    }

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
          guest: form,
          paymentType,      // hiện set "cod"
          paymentMethod,    // "bank_transfer_qr"
          coupon: appliedCode,
          note: noteLeft,
          invoice,
          itemIds: selectedItemIds,
        }),
      });
      const data: CheckoutResponse = await res.json();
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Đặt hàng thất bại");
      }
      sessionStorage.setItem("orderPreview", JSON.stringify(data.orderPreview));
      router.push("/checkout");
    } catch (error) {
      const message = error instanceof Error ? error.message : null;
      alert(message ?? "Không thể đặt hàng. Vui lòng thử lại.");
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
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                Xác nhận đơn hàng
              </h1>
              <p className="text-sm text-gray-600">
                Kiểm tra thông tin và hoàn tất đặt hàng
              </p>
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
          {/* LEFT COLUMN: products & payment */}
          <div className="lg:col-span-2 space-y-6">
          {/* Product list */}
          <div className="rounded-2xl border bg-white p-4 sm:p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-lg bg-orange-100 p-2">
                <Package className="h-5 w-5 text-orange-600" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900">Danh sách sản phẩm</h2>
              </div>

              {visibleItems.length === 0 ? (
                <div className="rounded-lg bg-gray-50 p-4 text-center text-sm text-gray-600">
                  Giỏ hàng trống
                </div>
              ) : (
                <div className="space-y-3">
                  {visibleItems.map((it) => (
                    <div key={it.id} className="flex gap-3 rounded-lg border p-3">
                      <div className="relative h-14 w-14 sm:h-16 sm:w-16 shrink-0 overflow-hidden rounded-md bg-gray-100">
                        <Image
                          src={it.imgUrl || "/logo.png"}
                          alt={it.name}
                          width={64}
                          height={64}
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

            {/* Payment + coupon + note */}
            <div className="rounded-2xl border bg-white p-4 sm:p-6 shadow-sm">
              <div className="mb-4 flex items-center gap-3">
                <div className="rounded-lg bg-blue-100 p-2">
                  <Banknote className="h-5 w-5 text-blue-600" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Thanh toán & Khuyến mãi
                </h2>
              </div>

              {/* Payment section - Select only, QR sẽ hiển thị bước sau */}
              <div className="space-y-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="rounded-lg bg-blue-100 p-2">
                    <CreditCard className="h-5 w-5 text-blue-600" />
                  </div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    Phương thức thanh toán
                  </h2>
                </div>

                <label className="flex items-start gap-3 rounded-lg border border-blue-500 bg-blue-50 p-4">
                  <input
                    type="radio"
                    checked
                    readOnly
                    className="h-4 w-4 mt-1 text-blue-600"
                  />
                  <div className="text-sm">
                    <div className="font-semibold text-gray-900">
                      Chuyển khoản ngân hàng qua QR
                    </div>
                    <ul className="mt-2 text-gray-700 space-y-1">
                      <li>
                        <b>Đơn vị thụ hưởng:</b> CÔNG TY TNHH AHSO
                      </li>
                      <li>
                        <b>Số tài khoản:</b> 03168969399
                      </li>
                      <li>
                        <b>Ngân hàng:</b> TPBank – Chi nhánh Bình Chánh
                      </li>
                    </ul>
                  </div>
                </label>
              </div>

              {/* Coupon */}
              <div className="mt-6">
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Mã khuyến mãi
                </label>
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
                {errors.promo && (
                  <p className="mt-2 text-sm text-red-600">{errors.promo}</p>
                )}
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

          {/* RIGHT COLUMN: summary + shipping */}
          <div className="lg:col-span-1 space-y-6">
            <div className="rounded-2xl border bg-white p-4 sm:p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">
                Tóm tắt đơn hàng
              </h2>

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
                  <span className="text-xl font-bold text-blue-600">
                    {formatVND(grandTotal)}
                  </span>
                </div>
                <p className="text-xs text-gray-500">* Đã bao gồm VAT</p>
              </div>

              <button
                onClick={handlePlaceOrder}
                disabled={!agree || visibleItems.length === 0}
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
                    <h3 className="text-sm font-semibold text-green-900">
                      Thanh toán an toàn
                    </h3>
                    <p className="mt-1 text-xs text-green-700">
                      Thông tin của bạn được mã hóa và bảo mật
                    </p>
                  </div>
                </div>
              </div>
            </div>

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
          </div>
        </div>

        {/* Mobile CTA */}
        <div className="lg:hidden fixed inset-x-0 bottom-0 z-40 border-t bg-white/90 backdrop-blur">
          <div className="mx-auto max-w-7xl px-4 py-3 flex items-center gap-3">
            <div className="flex-1">
              <div className="text-xs text-gray-600">Tổng cộng</div>
              <div className="text-lg font-bold text-blue-600">
                {formatVND(grandTotal)}
              </div>
            </div>
            <button
              onClick={handlePlaceOrder}
              disabled={!agree || visibleItems.length === 0}
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
  setForm: Dispatch<SetStateAction<GuestInfo>>;
  errors: Record<string, string>;
  setErrors: Dispatch<SetStateAction<Record<string, string>>>;
  invoice: boolean;
  setInvoice: (v: boolean) => void;
  agree: boolean;
  setAgree: (v: boolean) => void;
  onChange: (
    k: keyof GuestInfo,
  ) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
}) {
  const [mode, setMode] = useState<"view" | "edit">(isLoggedIn ? "view" : "edit");
  const readOnly = isLoggedIn && mode === "view";

  useEffect(() => {
    setMode(isLoggedIn ? "view" : "edit");
  }, [isLoggedIn]);

  async function saveProfile() {
    try {
      const r = await fetch("/api/profile", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: form.fullName,
          phone: form.phoneE164,
          taxCode: form.taxCode || null,
          shippingAddress: {
            line1: form.line1,
            line2: form.line2 || undefined,
            city: form.city,
            state: form.state || undefined,
            postalCode: form.postalCode || undefined,
            country: (form.country || "VN").toUpperCase(),
          },
        }),
      });
      if (!r.ok) throw 0;
      setMode("view");
    } catch {
      alert("Không thể lưu hồ sơ. Vui lòng thử lại.");
    }
  }

  const handleToggleInvoice = (checked: boolean) => {
    setInvoice(checked);
    if (!checked) {
      // Tắt hoá đơn -> clear lỗi billing
      setForm((f) => ({ ...f, useSeparateBilling: false }));
      setErrors((prev) => {
        const clone = { ...prev };
        delete clone.taxCode;
        delete clone.billingLine1;
        delete clone.billingCity;
        return clone;
      });
    }
  };

  const handleToggleSeparateBilling = (checked: boolean) => {
    setForm((f) => ({ ...f, useSeparateBilling: checked }));
    setErrors((prev) => {
      const clone = { ...prev };
      delete clone.billingLine1;
      delete clone.billingCity;
      return clone;
    });
  };

  const useSeparateBilling = !!form.useSeparateBilling;

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

      {/* Form shipping */}
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          id="fullName"
          label="Họ và tên"
          required
          value={form.fullName}
          onChange={onChange("fullName")}
          error={errors.fullName}
          className="sm:col-span-2"
          readOnly={readOnly}
        />
        <IconField
          id="email"
          label="Email"
          icon={<Mail className="h-5 w-5 text-gray-400" />}
          required
          value={form.email}
          onChange={onChange("email")}
          error={errors.email}
          readOnly={readOnly}
        />
        <IconField
          id="phoneE164"
          label="Số điện thoại"
          icon={<Phone className="h-5 w-5 text-gray-400" />}
          required
          value={form.phoneE164}
          onChange={onChange("phoneE164")}
          error={errors.phoneE164}
          readOnly={readOnly}
        />
        <TextField
          id="line1"
          label="Địa chỉ"
          required
          value={form.line1}
          onChange={onChange("line1")}
          error={errors.line1}
          className="sm:col-span-2"
          readOnly={readOnly}
        />
        <TextField
          id="line2"
          label="Địa chỉ bổ sung"
          value={form.line2 ?? ""}
          onChange={onChange("line2")}
          className="sm:col-span-2"
          readOnly={readOnly}
        />
        <TextField
          id="city"
          label="Tỉnh/Thành phố"
          required
          value={form.city}
          onChange={onChange("city")}
          error={errors.city}
          readOnly={readOnly}
        />
        <TextField
          id="state"
          label="Quận/Huyện"
          value={form.state ?? ""}
          onChange={onChange("state")}
          readOnly={readOnly}
        />
      </div>

      {/* Hóa đơn */}
      <div className="mt-6 rounded-2xl border bg-white">
        <div className="p-6">
          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-lg bg-purple-100 p-2">
              <FileText className="h-5 w-5 text-purple-600" />
            </div>
            <h3 className="text-base font-semibold text-gray-900">
              Thông tin hóa đơn
            </h3>
          </div>

          <label className="mb-4 flex cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              checked={invoice}
              onChange={(e) => handleToggleInvoice(e.target.checked)}
              className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-gray-700">
              Xuất hóa đơn công ty
            </span>
          </label>

          {invoice && (
            <div className="space-y-4 rounded-lg bg-gray-50 p-4">
              <TextField
                id="taxCode"
                label="Mã số thuế"
                required
                value={form.taxCode ?? ""}
                onChange={onChange("taxCode")}
                error={errors.taxCode}
                readOnly={readOnly}
              />

              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  checked={useSeparateBilling}
                  onChange={(e) => handleToggleSeparateBilling(e.target.checked)}
                  className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  Địa chỉ hóa đơn khác địa chỉ giao hàng
                </span>
              </label>

              {useSeparateBilling && (
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <TextField
                    id="billingLine1"
                    label="Địa chỉ hóa đơn"
                    required
                    value={form.billingLine1 ?? ""}
                    onChange={onChange("billingLine1")}
                    error={errors.billingLine1}
                    className="sm:col-span-2"
                    readOnly={readOnly}
                  />
                  <TextField
                    id="billingLine2"
                    label="Địa chỉ bổ sung (hóa đơn)"
                    value={form.billingLine2 ?? ""}
                    onChange={onChange("billingLine2")}
                    className="sm:col-span-2"
                    readOnly={readOnly}
                  />
                  <TextField
                    id="billingCity"
                    label="Tỉnh/Thành phố (hóa đơn)"
                    required
                    value={form.billingCity ?? ""}
                    onChange={onChange("billingCity")}
                    error={errors.billingCity}
                    readOnly={readOnly}
                  />
                  <TextField
                    id="billingState"
                    label="Quận/Huyện (hóa đơn)"
                    value={form.billingState ?? ""}
                    onChange={onChange("billingState")}
                    readOnly={readOnly}
                  />
                </div>
              )}
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
  onChange: ChangeEventHandler<HTMLInputElement>;
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
          ${error ? "border-red-500" : "border-gray-300"} ${
          readOnly ? "bg-gray-50 text-gray-700" : "bg-white"
        }`}
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
  onChange: ChangeEventHandler<HTMLInputElement>;
  required?: boolean;
  error?: string;
  icon: ReactNode;
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
            ${error ? "border-red-500" : "border-gray-300"} ${
            readOnly ? "bg-gray-50 text-gray-700" : "bg-white"
          }`}
        />
      </div>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}
