"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, Plus, Minus, PackageCheck, ShoppingCart, Percent, TicketPercent } from "lucide-react";
import { toast } from "sonner";

// -----------------------------
// Types
// -----------------------------
export type CartItem = {
  // Prefer server CartItem id when available to sync API (PATCH/DELETE)
  id: string; // cartItemId (if from API) or fallback local id
  cartItemId?: string; // explicit cart item id from server
  sku?: string; // variant SKU (for display/links)
  productId: string;
  name: string; // product name
  variantLabel?: string; // e.g. "M3 x 20"
  price: number; // unit price (VND)
  imgUrl?: string;
  slug: string; // product slug for linking
  qty: number;
  stock?: number; // optional for soft validation
};

// Discount can be fixed amount (VND) or percent
type Discount =
  | { kind: "percent"; value: number }
  | { kind: "fixed"; value: number }
  | { kind: "shipping_free" };

// -----------------------------
// Constants & helpers
// -----------------------------
const STORAGE_KEY = "cart:v1";
const VAT_RATE = 0.1; // 10%

const formatVND = (n: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(Math.max(0, Math.round(n)));

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

// Demo shipping methods (override with API if needed)
const SHIPPING_METHODS = [
  { id: "standard", label: "Tiêu chuẩn (2-4 ngày)", fee: 30000 },
  { id: "express", label: "Hoả tốc (1-2 ngày)", fee: 65000 },
  { id: "pickup", label: "Nhận tại cửa hàng", fee: 0 },
] as const;

// Simple promo code demo (replace with API validation)
const PROMOS: Record<string, Discount> = {
  GIAM10: { kind: "percent", value: 10 },
  GIAM50K: { kind: "fixed", value: 50000 },
  FREESHIP: { kind: "shipping_free" },
};

// -----------------------------
// Component
// -----------------------------
export default function CartPage() {
  const router = useRouter();
  const [items, setItems] = useState<CartItem[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [shipMethod, setShipMethod] = useState<typeof SHIPPING_METHODS[number]["id"]>("standard");
  const [promoInput, setPromoInput] = useState("");
  const [appliedCode, setAppliedCode] = useState<string | null>(null);
  const [note, setNote] = useState("");

  // Load/persist cart from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as CartItem[];
        setItems(parsed);
      } else {
        // Seed demo items for first-time preview (remove in production)
        const demo: CartItem[] = [
          {
            id: "DIN933-A4-M3x20",
            productId: "p1",
            name: "Bulong Inox 316 DIN933",
            variantLabel: "M3 × 20",
            price: 1214,
            imgUrl: "/images/bolts/din933-a4.jpg",
            slug: "bulong-inox-316-din933",
            qty: 2,
            stock: 30,
          },
          {
            id: "TPR-2ME25L",
            productId: "p2",
            name: "Bộ điều khiển Thyristor TPR-2ME25L",
            variantLabel: "1-5VDC / 4-20mA",
            price: 782460,
            imgUrl: "/images/tpr-2me25l.jpg",
            slug: "tpr-2me25l-hanyoung",
            qty: 1,
            stock: 8,
          },
        ];
        setItems(demo);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(demo));
      }
    } catch {}
  }, []);

  // Try syncing from server cart API (if available)
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/cart", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        const apiItems = (data?.cart?.items ?? []) as Array<any>;
        if (Array.isArray(apiItems) && apiItems.length > 0) {
          const mapped: CartItem[] = apiItems.map((it) => ({
            id: String(it.id), // cart item id from server
            cartItemId: String(it.id),
            sku: it.variantSku || undefined,
            productId: it.variantId || String(it.id),
            name: it.productTitle || it.variantSku || "",
            variantLabel: undefined,
            price: Number(it.unitPrice || 0),
            imgUrl: it.image || undefined,
            slug: it.productSlug || "",
            qty: Number(it.quantity || 1),
            stock: it.inStock ? 9999 : 0,
          }));
          setItems(mapped);
          try { localStorage.setItem(STORAGE_KEY, JSON.stringify(mapped)); } catch {}
        }
      } catch {}
    })();
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {}
  }, [items]);

  // Persist selection
  useEffect(() => {
    try {
      const ids = Object.entries(selected).filter(([, v]) => v).map(([k]) => k);
      localStorage.setItem("cart:selected", JSON.stringify(ids));
    } catch {}
  }, [selected]);

  // Totals
  const subtotal = useMemo(() => items.reduce((s, it) => s + it.price * it.qty, 0), [items]);
  const selectedCount = useMemo(() => Object.values(selected).filter(Boolean).length, [selected]);
  const allChecked = useMemo(() => items.length > 0 && items.every((i) => selected[i.id]), [items, selected]);

  const shippingFee = useMemo(() => {
    const m = SHIPPING_METHODS.find((m) => m.id === shipMethod)!;
    const hasFreeShip = appliedCode && PROMOS[appliedCode]?.kind === "shipping_free";
    return hasFreeShip ? 0 : m.fee;
  }, [shipMethod, appliedCode]);

  const discount = useMemo(() => {
    if (!appliedCode) return 0;
    const d = PROMOS[appliedCode];
    if (!d) return 0;
    if (d.kind === "percent") return (subtotal * d.value) / 100;
    if (d.kind === "fixed") return d.value;
    return 0;
  }, [appliedCode, subtotal]);

  const vat = useMemo(() => (subtotal - discount) * VAT_RATE, [subtotal, discount]);
  const grandTotal = useMemo(() => subtotal - discount + vat + shippingFee, [subtotal, discount, vat, shippingFee]);

  // Default select all when items loaded/changed (only set if new ids appear)
  useEffect(() => {
    setSelected((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const it of items) {
        if (next[it.id] == null) {
          next[it.id] = true;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [items]);

  const toggleOne = (id: string) => setSelected((s) => ({ ...s, [id]: !s[id] }));
  const selectAll = () => setSelected(Object.fromEntries(items.map((i) => [i.id, true])));
  const clearAll = () => setSelected(Object.fromEntries(items.map((i) => [i.id, false])));

  // Actions
  const changeQty = async (id: string, qty: number) => {
    const nextQty = Math.max(1, qty);
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, qty: clamp(nextQty, 1, it.stock ?? 9999) } : it)));
    const item = items.find((x) => x.id === id);
    const serverId = item?.cartItemId || item?.id;
    // If seems like a server id (cuid-like) try syncing
    if (serverId && serverId.length > 10) {
      try {
        await fetch(`/api/cart/items/${encodeURIComponent(serverId)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ quantity: nextQty }),
        });
      } catch {}
    }
  };
  const removeItem = async (id: string) => {
    const item = items.find((x) => x.id === id);
    const serverId = item?.cartItemId || item?.id;
    setItems((prev) => prev.filter((it) => it.id !== id));
    try {
      if (serverId && serverId.length > 10) {
        await fetch(`/api/cart/items/${encodeURIComponent(serverId)}`, { method: "DELETE" });
      }
    } catch {}
    toast.success("Đã xoá sản phẩm khỏi giỏ hàng.");
  };
  const clearCart = async () => {
    setItems([]);
    try { await fetch("/api/cart", { method: "DELETE" }); } catch {}
    toast.success("Đã xoá toàn bộ giỏ hàng.");
  };

  const applyPromo = () => {
    const code = promoInput.trim().toUpperCase();
    if (!code) return;
    if (!PROMOS[code]) {
      toast.error("Mã giảm giá không hợp lệ.");
      return;
    }
    setAppliedCode(code);
    setPromoInput("");
    toast.success(`Áp dụng mã "${code}" thành công.`);
  };
  const removePromo = () => { setAppliedCode(null); toast.info("Đã bỏ mã giảm giá."); };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-6 lg:px-8">
      <div className="mb-6 flex items-center gap-2 text-lg font-semibold">
        <ShoppingCart className="h-5 w-5" /> Giỏ hàng
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Cart table */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Danh sách sản phẩm</CardTitle>
            {items.length > 0 && (
              <Button variant="ghost" size="sm" className="text-red-500" onClick={clearCart}>
                <Trash2 className="mr-2 h-4 w-4" /> Xoá giỏ hàng
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <PackageCheck className="mb-3 h-10 w-10 opacity-60" />
                <p className="mb-4 text-muted-foreground">Giỏ hàng trống.</p>
                <Button onClick={() => router.push("/")}>Tiếp tục mua sắm</Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <div className="mb-2 flex items-center gap-2">
                  <button className="text-sm underline" onClick={selectAll}>Chọn tất cả</button>
                  <span className="text-gray-300">|</span>
                  <button className="text-sm underline" onClick={clearAll}>Bỏ chọn</button>
                  <span className="ml-auto text-sm text-muted-foreground">Đã chọn: {selectedCount}</span>
                </div>
                <table className="w-full border-separate border-spacing-y-2">
                  <thead>
                    <tr className="text-left text-sm text-muted-foreground">
                      <th className="w-10 p-2">
                        <input type="checkbox" checked={allChecked} onChange={(e) => (e.target.checked ? selectAll() : clearAll())} />
                      </th>
                      <th className="w-[420px] p-2 font-medium">Sản phẩm</th>
                      <th className="p-2 text-right font-medium">Đơn giá</th>
                      <th className="p-2 text-center font-medium">Số lượng</th>
                      <th className="p-2 text-right font-medium">Thành tiền</th>
                      <th className="p-2 text-right"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((it) => (
                      <tr key={it.id} className="rounded-md border">
                        <td className="p-2">
                          <input type="checkbox" checked={!!selected[it.id]} onChange={() => toggleOne(it.id)} />
                        </td>
                        <td className="p-2">
                          <div className="flex items-center gap-4">
                            <div className="relative h-16 w-16 overflow-hidden rounded-md border bg-white">
                              <Image src={it.imgUrl || "/placeholder.png"} alt={it.name} fill className="object-contain p-1" />
                            </div>
                            <div>
                              <Link href={`/p/${it.slug}`} className="line-clamp-2 font-medium hover:underline">
                                {it.name}
                              </Link>
                              {it.variantLabel && (
                                <div className="text-sm text-muted-foreground">Biến thể: {it.variantLabel}</div>
                              )}
                              {typeof it.stock === "number" && (
                                <div className="text-xs text-muted-foreground">Tồn kho: {it.stock}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="whitespace-nowrap p-2 text-right">{formatVND(it.price)}</td>
                        <td className="p-2">
                          <div className="mx-auto flex w-32 items-center justify-center gap-2">
                            <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => changeQty(it.id, (it.qty || 1) - 1)} disabled={it.qty <= 1}>
                              <Minus className="h-4 w-4" />
                            </Button>
                            <Input
                              className="h-8 text-center"
                              type="number"
                              value={it.qty}
                              min={1}
                              max={it.stock ?? 9999}
                              onChange={(e) => changeQty(it.id, Number(e.target.value) || 1)}
                            />
                            <Button
                              size="icon"
                              variant="outline"
                              className="h-8 w-8"
                              onClick={() => changeQty(it.id, (it.qty || 1) + 1)}
                              disabled={typeof it.stock === "number" ? it.qty >= it.stock : false}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                        <td className="whitespace-nowrap p-2 text-right">{formatVND(it.price * it.qty)}</td>
                        <td className="p-2 text-right">
                          <Button size="icon" variant="ghost" className="text-red-500" onClick={() => removeItem(it.id)}>
                            <Trash2 className="h-5 w-5" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Summary / totals */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Tóm tắt đơn hàng</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Shipping */}
              <div className="space-y-2">
                <div className="text-sm font-medium">Vận chuyển</div>
                <div className="relative">
                  <select
                    value={shipMethod}
                    onChange={(e) => setShipMethod(e.target.value as typeof SHIPPING_METHODS[number]["id"])}
                    className="w-full rounded-md border bg-background p-2 text-sm"
                  >
                    {SHIPPING_METHODS.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.label} · {formatVND(m.fee)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Promo code */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <TicketPercent className="h-4 w-4" /> Mã giảm giá
                </div>
                {appliedCode ? (
                  <div className="flex items-center justify-between rounded-md border p-2">
                    <span className="text-sm">Đang áp dụng: <span className="font-medium">{appliedCode}</span></span>
                    <Button variant="ghost" size="sm" onClick={removePromo} className="text-red-500">Bỏ mã</Button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Input
                      placeholder="Nhập mã (VD: GIAM10, FREESHIP)"
                      value={promoInput}
                      onChange={(e) => setPromoInput(e.target.value)}
                    />
                    <Button onClick={applyPromo} variant="outline" className="shrink-0">
                      <Percent className="mr-2 h-4 w-4" /> Áp dụng
                    </Button>
                  </div>
                )}
              </div>

              {/* Order note */}
              <div className="space-y-2">
                <div className="text-sm font-medium">Ghi chú đơn hàng</div>
                <Input
                  placeholder="Yêu cầu xuất hoá đơn, giờ nhận hàng, v.v. (tuỳ chọn)"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>

              <hr className="my-2" />

              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span>Tạm tính</span>
                  <span className="font-medium">{formatVND(subtotal)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Giảm giá</span>
                  <span className="font-medium">-{formatVND(discount)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>VAT (10%)</span>
                  <span className="font-medium">{formatVND(vat)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Phí vận chuyển</span>
                  <span className="font-medium">{formatVND(shippingFee)}</span>
                </div>
                <hr className="my-2" />
                <div className="flex items-center justify-between text-base">
                  <span className="font-semibold">Tổng cộng</span>
                  <span className="text-xl font-bold">{formatVND(grandTotal)}</span>
                </div>
                <div className="text-xs text-muted-foreground">Đã bao gồm VAT.</div>
              </div>
            </CardContent>
            <CardFooter>
              <Button
                className="w-full"
                size="lg"
                disabled={items.length === 0 || selectedCount === 0}
                onClick={() => {
                  const ids = Object.entries(selected).filter(([, v]) => v).map(([k]) => k);
                  if (!ids.length) { toast.error("Vui lòng chọn ít nhất một sản phẩm."); return; }
                  try { localStorage.setItem("cart:selected", JSON.stringify(ids)); } catch {}
                  toast.success("Đã chọn sản phẩm. Tiến hành thanh toán.");
                  router.push("/cart-review");
                }}
              >
                Tiến hành thanh toán ({selectedCount})
              </Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tiếp tục mua sắm</CardTitle>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full" onClick={() => router.push("/")}>Xem sản phẩm khác</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
