// lib/hooks/useCart.tsx
"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type CartItem = {
  id: string;
  name: string;
  price: number;
  qty: number;
  image?: string;
  slug?: string;
  sku?: string;
};

type CartCtx = {
  items: CartItem[];
  loading: boolean;
  add: (p: { sku: string; name: string; price: number; image?: string; slug?: string; qty?: number }) => Promise<void>;
  setQty: (id: string, qty: number) => Promise<void>;
  remove: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
  mergeGuestCart: () => Promise<void>; // ⭐ Mới: gộp guest cart khi login
  itemCount: number;
};

const CartContext = createContext<CartCtx | null>(null);

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);

  const mapServerItems = (serverItems: any[]): CartItem[] => {
    return serverItems.map((it) => ({
      id: String(it.id),
      name: it.productName ?? it.productSku ?? "",
      price: Number(it.unitPrice || 0),
      qty: Number(it.quantity || 1),
      image: it.productImage,
      slug: it.productSlug,
      sku: it.productSku,
    }));
  };

  const readCart = useCallback(async () => {
    setLoading(true);
    try {
      const token = getToken();
      const headers: HeadersInit = { "Content-Type": "application/json" };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const res = await fetch("/api/cart", {
        cache: "no-store",
        credentials: "include",
        headers,
      });

      if (!res.ok) {
        setItems([]);
        return;
      }

      const data = await res.json();
      const cart = data?.cart ?? data;
      const mapped = mapServerItems(cart?.items ?? []);
      setItems(mapped);
    } catch (error) {
      console.error("Error reading cart:", error);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    await readCart();
  }, [readCart]);

  // Initial load
  useEffect(() => {
    readCart();
  }, [readCart]);

  const add = useCallback<CartCtx["add"]>(
    async (p) => {
      try {
        const token = getToken();
        const headers: HeadersInit = { "Content-Type": "application/json" };
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }

        const res = await fetch("/api/cart/items", {
          method: "POST",
          headers,
          credentials: "include",
          body: JSON.stringify({ sku: p.sku, quantity: p.qty ?? 1 }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: "Unknown error" }));
          throw new Error(err.error || "Failed to add to cart");
        }

        toast.success("Đã thêm vào giỏ hàng");
        await readCart();
      } catch (error: any) {
        console.error("Add to cart error:", error);
        toast.error(error.message || "Không thể thêm vào giỏ");
      }
    },
    [readCart]
  );

  const setQty = useCallback<CartCtx["setQty"]>(
    async (id, qty) => {
      try {
        const token = getToken();
        const headers: HeadersInit = { "Content-Type": "application/json" };
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }

        const res = await fetch(`/api/cart/items/${encodeURIComponent(id)}`, {
          method: "PATCH",
          headers,
          credentials: "include",
          body: JSON.stringify({ quantity: qty }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: "Unknown error" }));
          throw new Error(err.error || "Failed to update quantity");
        }

        await readCart();
      } catch (error: any) {
        console.error("Set quantity error:", error);
        toast.error(error.message || "Không thể cập nhật số lượng");
      }
    },
    [readCart]
  );

  const remove = useCallback<CartCtx["remove"]>(
    async (id) => {
      try {
        const token = getToken();
        const headers: HeadersInit = {};
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }

        const res = await fetch(`/api/cart/items/${encodeURIComponent(id)}`, {
          method: "DELETE",
          headers,
          credentials: "include",
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: "Unknown error" }));
          throw new Error(err.error || "Failed to remove item");
        }

        toast.success("Đã xóa khỏi giỏ");
        await readCart();
      } catch (error: any) {
        console.error("Remove item error:", error);
        toast.error(error.message || "Không thể xóa sản phẩm");
      }
    },
    [readCart]
  );

  /**
   * ⭐ Gộp guest cart vào user cart sau khi login
   */
  const mergeGuestCart = useCallback(async () => {
    try {
      const token = getToken();
      if (!token) return; // Chỉ merge khi đã login

      const res = await fetch("/api/cart/merge", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
      });

      if (res.ok) {
        const data = await res.json();
        console.log("Cart merged:", data.message);
        await readCart();
      }
    } catch (error) {
      console.error("Merge cart error:", error);
    }
  }, [readCart]);

  const itemCount = useMemo(() => items.reduce((sum, it) => sum + it.qty, 0), [items]);

  const value = useMemo<CartCtx>(
    () => ({
      items,
      loading,
      add,
      setQty,
      remove,
      refresh,
      mergeGuestCart,
      itemCount,
    }),
    [items, loading, add, setQty, remove, refresh, mergeGuestCart, itemCount]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}