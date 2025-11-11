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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Trash2,
  Plus,
  Minus,
  PackageCheck,
  ShoppingCart,
  CheckCircle,
  ArrowRight,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

/* ================= Types ================= */
export type CartItem = {
  id: string;
  cartItemId?: string;
  productId?: string;
  sku?: string;
  name: string;
  price: number;
  imgUrl?: string;
  slug: string;
  qty: number;
  stock?: number;
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
    unitPrice: any;
    currency: string | null;
    taxIncluded: boolean | null;
    quantity: number;
    lineTotal: any;
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
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    itemId: string | null;
    itemName: string;
    isLastQty: boolean;
  }>({ open: false, itemId: null, itemName: "", isLastQty: false });
  const [clearCartDialog, setClearCartDialog] = useState(false);

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
      }));

      setItems(mapped);

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
  const changeQty = async (id: string, newQty: number, showToast = true) => {
    const item = items.find((it) => it.id === id);
    if (!item) return;

    // Nếu giảm về 0 thì mở dialog xóa
    if (newQty <= 0) {
      setDeleteDialog({
        open: true,
        itemId: id,
        itemName: item.name,
        isLastQty: true,
      });
      return;
    }

    const nextQty = clamp(newQty, 1, item.stock ?? 9999);
    const prevQty = item.qty;

    // Optimistic update
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, qty: nextQty } : it))
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

      if (showToast) {
        if (nextQty > prevQty) {
          toast.success(`Đã tăng số lượng "${item.name}" lên ${nextQty}`);
        } else if (nextQty < prevQty) {
          toast.success(`Đã giảm số lượng "${item.name}" xuống ${nextQty}`);
        }
      }

      await fetchCart();
    } catch (e: any) {
      toast.error(e?.message || "Không thể cập nhật số lượng.");
      await fetchCart();
    }
  };

  const removeItem = async (id: string) => {
    const item = items.find((it) => it.id === id);
    if (!item) return;

    try {
      const res = await fetch(`/api/cart/items/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || "Xoá thất bại");
      }
      toast.success(`Đã xoá "${item.name}" khỏi giỏ hàng.`);
      await fetchCart();
    } catch (e: any) {
      toast.error(e?.message || "Không thể xoá sản phẩm.");
      await fetchCart();
    }
  };

  const handleRemoveClick = (id: string) => {
    const item = items.find((it) => it.id === id);
    if (!item) return;

    setDeleteDialog({
      open: true,
      itemId: id,
      itemName: item.name,
      isLastQty: false,
    });
  };

  const confirmDelete = async () => {
    if (!deleteDialog.itemId) return;
    await removeItem(deleteDialog.itemId);
    setDeleteDialog({ open: false, itemId: null, itemName: "", isLastQty: false });
  };

  const clearCart = async () => {
    if (items.length === 0) return;

    try {
      await Promise.all(
        items.map((it) =>
          fetch(`/api/cart/items/${encodeURIComponent(it.id)}`, {
            method: "DELETE",
          })
        )
      );
      toast.success("Đã xoá toàn bộ giỏ hàng.");
      setClearCartDialog(false);
    } catch {
      toast.error("Không thể xoá một số sản phẩm.");
    } finally {
      await fetchCart();
    }
  };

  /* ================= Render ================= */
  return (
    <div className="min-h-screen bg-linear-to-br from-gray-50 via-blue-50 to-indigo-50">
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex items-center gap-3 rounded-2xl bg-white p-6 shadow-lg">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-linear-to-br from-blue-500 to-indigo-600">
            <ShoppingCart className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Giỏ hàng của bạn</h1>
            <p className="text-sm text-gray-600">
              {items.length > 0 ? `${items.length} sản phẩm` : "Chưa có sản phẩm"}
            </p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Cart table */}
          <Card className="shadow-xl lg:col-span-2 border-0">
            <CardHeader className="flex-row items-center justify-between bg-linear-to-r from-blue-600 to-indigo-600 text-white rounded-t-xl">
              <CardTitle className="text-xl">Danh sách sản phẩm</CardTitle>
              {items.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white hover:bg-white/20"
                  onClick={() => setClearCartDialog(true)}
                  disabled={loading}
                >
                  <Trash2 className="mr-2 h-4 w-4" /> Xoá tất cả
                </Button>
              )}
            </CardHeader>
            <CardContent className="p-6">
              {loading ? (
                <div className="py-16 text-center">
                  <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
                  <p className="text-sm text-gray-600">Đang tải giỏ hàng…</p>
                </div>
              ) : items.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-linear-to-br from-blue-100 to-indigo-100">
                    <PackageCheck className="h-12 w-12 text-blue-600" />
                  </div>
                  <h3 className="mb-2 text-xl font-semibold text-gray-900">
                    Giỏ hàng trống
                  </h3>
                  <p className="mb-6 text-gray-600">
                    Hãy thêm sản phẩm để bắt đầu mua sắm
                  </p>
                  <Button
                    size="lg"
                    className="bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                    onClick={() => router.push("/shop/products")}
                  >
                    Khám phá sản phẩm
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between rounded-lg bg-linear-to-r from-blue-50 to-indigo-50 p-4">
                    <div className="flex items-center gap-4">
                      <input
                        type="checkbox"
                        checked={allChecked}
                        onChange={(e) =>
                          e.target.checked ? selectAll() : clearAll()
                        }
                        className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                      />
                      <div className="flex gap-3">
                        <button
                          className="text-sm font-medium text-blue-600 hover:text-blue-800"
                          onClick={selectAll}
                        >
                          Chọn tất cả
                        </button>
                        <span className="text-gray-400">•</span>
                        <button
                          className="text-sm font-medium text-blue-600 hover:text-blue-800"
                          onClick={clearAll}
                        >
                          Bỏ chọn
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                      <CheckCircle className="h-4 w-4 text-blue-600" />
                      Đã chọn: <span className="text-blue-600">{selectedCount}</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {items.map((it) => (
                      <div
                        key={it.id}
                        className={`group rounded-xl border-2 bg-white p-4 transition-all duration-200 hover:shadow-lg ${
                          selected[it.id]
                            ? "border-blue-500 shadow-md"
                            : "border-gray-200"
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <input
                            type="checkbox"
                            checked={!!selected[it.id]}
                            onChange={() => toggleOne(it.id)}
                            className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                          />

                          <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg border-2 border-gray-200 bg-white">
                            <Image
                              src={it.imgUrl || "/logo.png"}
                              alt={it.name}
                              fill
                              className="object-contain p-2"
                            />
                          </div>

                          <div className="flex-1 space-y-2">
                            <Link
                              href={`/shop/products/${it.slug}`}
                              className="line-clamp-2 text-lg font-semibold text-gray-900 hover:text-blue-600"
                            >
                              {it.name}
                            </Link>
                            <div className="flex flex-wrap gap-3 text-sm">
                              {it.sku && (
                                <span className="rounded-full bg-gray-100 px-3 py-1 text-gray-700">
                                  SKU: {it.sku}
                                </span>
                              )}
                              {typeof it.stock === "number" && (
                                <span className="rounded-full bg-green-100 px-3 py-1 text-green-700">
                                  Còn {it.stock} sản phẩm
                                </span>
                              )}
                            </div>
                            <div className="text-xl font-bold text-blue-600">
                              {formatVND(it.price)}
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-3">
                            <div className="flex items-center gap-2 rounded-lg border-2 border-gray-200 bg-gray-50 p-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 hover:bg-blue-100"
                                onClick={() => changeQty(it.id, it.qty - 1)}
                                disabled={loading}
                              >
                                <Minus className="h-4 w-4" />
                              </Button>
                              <Input
                                className="h-8 w-16 border-0 bg-white text-center font-semibold"
                                type="number"
                                value={it.qty}
                                min={1}
                                max={it.stock ?? 9999}
                                onChange={(e) =>
                                  changeQty(
                                    it.id,
                                    Number(e.target.value) || 1,
                                    false
                                  )
                                }
                                disabled={loading}
                              />
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 hover:bg-blue-100"
                                onClick={() => changeQty(it.id, it.qty + 1)}
                                disabled={
                                  loading ||
                                  (typeof it.stock === "number" && it.qty >= it.stock)
                                }
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>

                            <div className="text-right">
                              <div className="text-xs text-gray-600">Thành tiền</div>
                              <div className="text-lg font-bold text-gray-900">
                                {formatVND(it.price * it.qty)}
                              </div>
                            </div>

                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-red-500 hover:bg-red-50 hover:text-red-700"
                              onClick={() => handleRemoveClick(it.id)}
                              disabled={loading}
                            >
                              <Trash2 className="h-5 w-5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Summary */}
          <div className="space-y-6">
            <Card className="sticky top-24 border-0 shadow-xl">
              <CardHeader className="bg-linear-to-r from-blue-600 to-indigo-600 rounded-t-xl">
                <CardTitle className="flex items-center gap-2 text-xl text-white">
                  <PackageCheck className="h-5 w-5" />
                  Tóm tắt đơn hàng
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-base">
                    <span className="text-gray-600">Tạm tính</span>
                    <span className="text-lg font-semibold text-gray-900">
                      {formatVND(subtotal)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-base">
                    <span className="text-gray-600">VAT (10%)</span>
                    <span className="text-lg font-semibold text-gray-900">
                      {formatVND(vat)}
                    </span>
                  </div>

                  <div className="h-px bg-linear-to-r from-transparent via-gray-300 to-transparent"></div>

                  <div className="rounded-xl bg-linear-to-r from-blue-50 via-indigo-50 to-blue-50 p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-bold text-gray-900">
                        Tổng cộng
                      </span>
                      <span className="text-3xl font-bold text-transparent bg-clip-text bg-linear-to-r from-blue-600 to-indigo-600">
                        {formatVND(grandTotal)}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-gray-600 text-center">
                      * Đã bao gồm VAT 10%
                    </p>
                  </div>
                </div>

                {selectedCount > 0 && (
                  <div className="flex items-center gap-2 rounded-lg bg-green-50 p-4 text-sm">
                    <CheckCircle className="h-5 w-5 text-green-600 shrink-0" />
                    <span className="text-gray-700">
                      Đã chọn{" "}
                      <strong className="text-green-600">{selectedCount}</strong>{" "}
                      sản phẩm
                    </span>
                  </div>
                )}
              </CardContent>

              <CardFooter className="flex-col gap-3 p-6 pt-0">
                <Button
                  className="w-full h-12 text-base font-semibold bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all duration-300"
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
                      localStorage.setItem(STORAGE_SELECTED, JSON.stringify(ids));
                    } catch {}
                    router.push("/cart-review");
                  }}
                >
                  Tiến hành thanh toán
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>

                <Button
                  variant="outline"
                  className="w-full h-12 border-2 hover:bg-gray-50"
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

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog.open} onOpenChange={(open: boolean) => 
        setDeleteDialog({ ...deleteDialog, open })
      }>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <DialogTitle className="text-xl">
                {deleteDialog.isLastQty ? "Xóa sản phẩm?" : "Xác nhận xóa"}
              </DialogTitle>
            </div>
            <DialogDescription className="text-base">
              {deleteDialog.isLastQty ? (
                <>
                  Bạn đang giảm số lượng xuống 0. Bạn có muốn xóa{" "}
                  <strong className="text-gray-900">"{deleteDialog.itemName}"</strong>{" "}
                  khỏi giỏ hàng không?
                </>
              ) : (
                <>
                  Bạn có chắc chắn muốn xóa{" "}
                  <strong className="text-gray-900">"{deleteDialog.itemName}"</strong>{" "}
                  khỏi giỏ hàng không? Hành động này không thể hoàn tác.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setDeleteDialog({ ...deleteDialog, open: false })}
              className="border-2"
            >
              Hủy bỏ
            </Button>
            <Button
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Xóa sản phẩm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Clear Cart Dialog */}
      <Dialog open={clearCartDialog} onOpenChange={setClearCartDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                <Trash2 className="h-6 w-6 text-red-600" />
              </div>
              <DialogTitle className="text-xl">
                Xóa toàn bộ giỏ hàng?
              </DialogTitle>
            </div>
            <DialogDescription className="text-base">
              Bạn có chắc chắn muốn xóa{" "}
              <strong className="text-gray-900">tất cả {items.length} sản phẩm</strong>{" "}
              trong giỏ hàng không? Hành động này không thể hoàn tác.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setClearCartDialog(false)}
              className="border-2"
            >
              Hủy bỏ
            </Button>
            <Button
              onClick={clearCart}
              className="bg-red-600 hover:bg-red-700"
            >
              Xóa tất cả
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}