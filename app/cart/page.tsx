"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Trash2,
  Plus,
  Minus,
  PackageCheck,
  ShoppingCart,
  CheckCircle,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";

/* ================= Types ================= */
export type CartItem = {
  id: string; // cartItemId (server)
  cartItemId?: string; // alias = id
  productId?: string;
  sku?: string; // productSku
  name: string; // productName
  price: number; // unitPrice (VND)
  imgUrl?: string; // productImage
  slug: string; // productSlug
  qty: number; // quantity
  stock?: number; // optional (nếu có)
};

type ServerCart = {
  id: string;
  items: Array<{
    id: string;
    cartId: string;
    productId: string | null;
    productName: string | null;
    productSku: string | null;
    productSlug: string | null;
    productImage: string | null;
    unitLabel: string | null;
    quantityLabel: string | null;
    unitPrice: any; // Decimal
    currency: string | null;
    taxIncluded: boolean | null;
    quantity: number;
    lineTotal: any; // Decimal
  }>;
  subtotal?: any;
  discountTotal?: any;
  taxTotal?: any;
  shippingFee?: any;
  grandTotal?: any;
};

const STORAGE_SELECTED = "cart:selected:v1";
const VAT_RATE = 0.1;

/* ================= Helpers ================= */
const formatVND = (n: number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Math.max(0, Math.round(n)));

const clamp = (v: number, min: number, max: number) =>
  Math.max(min, Math.min(max, v));

/* ================= Component ================= */
export default function CartPage() {
  const router = useRouter();
  const [items, setItems] = useState<CartItem[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  // ---- fetch cart from server ----
  async function fetchCart() {
    try {
      setLoading(true);
      const res = await fetch("/api/cart", { cache: "no-store" });
      if (!res.ok) {
        setItems([]);
        return;
      }
      const data = (await res.json()) as ServerCart | { cart?: ServerCart };

      const cart =
        ("cart" in data ? (data as any).cart : data) as ServerCart | undefined;
      const rawItems = cart?.items || [];

      const mapped: CartItem[] = rawItems.map((it) => ({
        id: it.id,
        cartItemId: it.id,
        productId: it.productId || undefined,
        sku: it.productSku || undefined,
        name: it.productName || it.productSku || "",
        price: Number(it.unitPrice || 0),
        imgUrl: it.productImage || undefined,
        slug: it.productSlug || "",
        qty: Number(it.quantity || 1),
        // Không có stock từ API -> để undefined; nếu sau này include product thì set
      }));

      setItems(mapped);

      // auto-mark selected cho item mới xuất hiện
      setSelected((prev) => {
        const next = { ...prev };
        let changed = false;
        for (const it of mapped) {
          if (next[it.id] == null) {
            next[it.id] = true;
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    } catch (e) {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // khôi phục tick chọn
    try {
      const raw = localStorage.getItem(STORAGE_SELECTED);
      if (raw) {
        const ids = JSON.parse(raw) as string[];
        const map = Object.fromEntries(ids.map((id) => [id, true]));
        setSelected(map);
      }
    } catch {}
    fetchCart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // persist lựa chọn
  useEffect(() => {
    try {
      const ids = Object.entries(selected)
        .filter(([, v]) => v)
        .map(([k]) => k);
      localStorage.setItem(STORAGE_SELECTED, JSON.stringify(ids));
    } catch {}
  }, [selected]);

  // ---- derived values ----
  const selectedItems = useMemo(
    () => items.filter((it) => !!selected[it.id]),
    [items, selected]
  );
  const selectedCount = useMemo(
    () => Object.values(selected).filter(Boolean).length,
    [selected]
  );
  const allChecked = useMemo(
    () => items.length > 0 && items.every((i) => selected[i.id]),
    [items, selected]
  );

  const subtotal = useMemo(
    () => selectedItems.reduce((s, it) => s + it.price * it.qty, 0),
    [selectedItems]
  );
  const vat = useMemo(() => subtotal * VAT_RATE, [subtotal]);
  const grandTotal = useMemo(() => subtotal + vat, [subtotal, vat]);

  // ---- selection helpers ----
  const toggleOne = (id: string) =>
    setSelected((s) => ({ ...s, [id]: !s[id] }));
  const selectAll = () =>
    setSelected(Object.fromEntries(items.map((i) => [i.id, true])));
  const clearAll = () =>
    setSelected(Object.fromEntries(items.map((i) => [i.id, false])));

  // ---- actions (API) ----
  const changeQty = async (id: string, qty: number) => {
    const nextQty = Math.max(1, qty);
    // Optimistic update (local)
    setItems((prev) =>
      prev.map((it) =>
        it.id === id
          ? { ...it, qty: clamp(nextQty, 1, it.stock ?? 9999) }
          : it
      )
    );
    try {
      const res = await fetch(`/api/cart/items/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity: nextQty }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || "Cập nhật số lượng thất bại");
      }
      // sync lại từ server để tránh lệch tiền/tổng
      await fetchCart();
    } catch (e: any) {
      toast.error(e?.message || "Không thể cập nhật số lượng.");
      // rollback bằng cách refetch
      await fetchCart();
    }
  };

  const removeItem = async (id: string) => {
    // Optimistic remove
    setItems((prev) => prev.filter((it) => it.id !== id));
    try {
      const res = await fetch(`/api/cart/items/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || "Xoá thất bại");
      }
      toast.success("Đã xoá sản phẩm khỏi giỏ.");
      await fetchCart();
    } catch (e: any) {
      toast.error(e?.message || "Không thể xoá sản phẩm.");
      await fetchCart();
    }
  };

  const clearCart = async () => {
    if (items.length === 0) return;
    // Không có DELETE /api/cart → xoá từng item
    try {
      await Promise.all(
        items.map((it) =>
          fetch(`/api/cart/items/${encodeURIComponent(it.id)}`, {
            method: "DELETE",
          })
        )
      );
      toast.success("Đã xoá toàn bộ giỏ hàng.");
    } catch {
      toast.error("Không thể xoá một số sản phẩm.");
    } finally {
      await fetchCart();
    }
  };

  /* ================= Render ================= */
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
              <Button
                variant="ghost"
                size="sm"
                className="text-red-500"
                onClick={clearCart}
                disabled={loading}
              >
                <Trash2 className="mr-2 h-4 w-4" /> Xoá giỏ hàng
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                Đang tải giỏ hàng…
              </div>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <PackageCheck className="mb-3 h-10 w-10 opacity-60" />
                <p className="mb-4 text-muted-foreground">Giỏ hàng trống.</p>
                <Button onClick={() => router.push("/shop/products")}>
                  Tiếp tục mua sắm
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <div className="mb-2 flex items-center gap-2">
                  <button className="text-sm underline" onClick={selectAll}>
                    Chọn tất cả
                  </button>
                  <span className="text-gray-300">|</span>
                  <button className="text-sm underline" onClick={clearAll}>
                    Bỏ chọn
                  </button>
                  <span className="ml-auto text-sm text-muted-foreground">
                    Đã chọn: {selectedCount}
                  </span>
                </div>
                <table className="w-full border-separate border-spacing-y-2">
                  <thead>
                    <tr className="text-left text-sm text-muted-foreground">
                      <th className="w-10 p-2">
                        <input
                          type="checkbox"
                          checked={allChecked}
                          onChange={(e) =>
                            e.target.checked ? selectAll() : clearAll()
                          }
                        />
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
                          <input
                            type="checkbox"
                            checked={!!selected[it.id]}
                            onChange={() => toggleOne(it.id)}
                          />
                        </td>
                        <td className="p-2">
                          <div className="flex items-center gap-4">
                            <div className="relative h-16 w-16 overflow-hidden rounded-md border bg-white">
                              <Image
                                src={it.imgUrl || "/logo.png"}
                                alt={it.name}
                                fill
                                className="object-contain p-1"
                              />
                            </div>
                            <div>
                              <Link
                                href={`/shop/products/${it.slug}`}
                                className="line-clamp-2 font-medium hover:underline"
                              >
                                {it.name}
                              </Link>
                              {typeof it.stock === "number" && (
                                <div className="text-xs text-muted-foreground">
                                  Tồn kho: {it.stock}
                                </div>
                              )}
                              {it.sku && (
                                <div className="text-xs text-muted-foreground">
                                  SKU: {it.sku}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="whitespace-nowrap p-2 text-right">
                          {formatVND(it.price)}
                        </td>
                        <td className="p-2">
                          <div className="mx-auto flex w-32 items-center justify-center gap-2">
                            <Button
                              size="icon"
                              variant="outline"
                              className="h-8 w-8"
                              onClick={() => changeQty(it.id, (it.qty || 1) - 1)}
                              disabled={it.qty <= 1 || loading}
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                            <Input
                              className="h-8 text-center"
                              type="number"
                              value={it.qty}
                              min={1}
                              max={it.stock ?? 9999}
                              onChange={(e) =>
                                changeQty(
                                  it.id,
                                  Number(e.target.value) || 1
                                )
                              }
                              disabled={loading}
                            />
                            <Button
                              size="icon"
                              variant="outline"
                              className="h-8 w-8"
                              onClick={() => changeQty(it.id, (it.qty || 1) + 1)}
                              disabled={
                                loading ||
                                (typeof it.stock === "number"
                                  ? it.qty >= it.stock
                                  : false)
                              }
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                        <td className="whitespace-nowrap p-2 text-right">
                          {formatVND(it.price * it.qty)}
                        </td>
                        <td className="p-2 text-right">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-red-500"
                            onClick={() => removeItem(it.id)}
                            disabled={loading}
                          >
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

        {/* Summary */}
        <div className="space-y-6">
          <Card className="sticky top-24">
            <CardHeader className="bg-linear-to-r from-blue-50 to-indigo-50 rounded-t-xl">
              <CardTitle className="flex items-center gap-2 text-xl">
                <PackageCheck className="h-5 w-5 text-blue-600" />
                Tóm tắt đơn hàng
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between text-base">
                  <span className="text-gray-600">Tạm tính</span>
                  <span className="font-semibold text-gray-900">
                    {formatVND(subtotal)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-base">
                  <span className="text-gray-600">VAT (10%)</span>
                  <span className="font-semibold text-gray-900">
                    {formatVND(vat)}
                  </span>
                </div>

                <div className="h-px bg-linear-to-r from-transparent via-gray-300 to-transparent"></div>

                <div className="flex items-center justify-between py-2 px-4 bg-linear-to-r from-blue-50 to-indigo-50 rounded-lg">
                  <span className="text-lg font-bold text-gray-900">
                    Tổng cộng
                  </span>
                  <span className="text-2xl font-bold text-blue-600">
                    {formatVND(grandTotal)}
                  </span>
                </div>

                <p className="text-xs text-gray-500 text-center">
                  * Giá đã bao gồm VAT 10%
                </p>
              </div>

              {selectedCount > 0 && (
                <div className="flex items-center gap-2 text-sm text-gray-600 bg-blue-50 rounded-lg p-3">
                  <CheckCircle className="h-4 w-4 text-blue-600" />
                  <span>
                    Đã chọn{" "}
                    <strong className="text-blue-600">{selectedCount}</strong>{" "}
                    sản phẩm
                  </span>
                </div>
              )}
            </CardContent>

            <CardFooter className="flex-col gap-3 pb-6">
              <Button
                className="w-full h-12 text-base font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                size="lg"
                disabled={items.length === 0 || selectedCount === 0 || loading}
                onClick={() => {
                  const ids = Object.entries(selected)
                    .filter(([, v]) => v)
                    .map(([k]) => k);
                  if (!ids.length) {
                    toast.error("Vui lòng chọn ít nhất một sản phẩm.");
                    return;
                  }
                  try {
                    localStorage.setItem(
                      STORAGE_SELECTED,
                      JSON.stringify(ids)
                    );
                  } catch {}
                  router.push("/cart-review");
                }}
              >
                Tiến hành thanh toán
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>

              <Button
                variant="outline"
                className="w-full"
                onClick={() => router.push("/shop/products")}
                disabled={loading}
              >
                Tiếp tục mua sắm
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
