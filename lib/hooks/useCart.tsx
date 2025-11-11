// hooks/useCart.tsx
"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { ls_get, ls_set, ls_add, ls_setQty, ls_remove, ls_clear, type LocalCartItem } from "@/lib/cart-storage";

type ServerCartItem = {
  id: string; productSlug?: string; productName?: string; productImage?: string;
  productSku?: string; quantity: number; unitPrice: number;
};

type CartCtx = {
  items: Array<{
    id: string; name: string; price: number; qty: number;
    image?: string; slug?: string; sku?: string; isServer?: boolean;
  }>;
  loading: boolean;
  add: (p: { sku: string; name: string; price: number; image?: string; slug?: string; qty?: number; }) => Promise<void>;
  setQty: (id: string, qty: number) => Promise<void>;
  remove: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
  isLoggedIn: boolean;
};

const CartContext = createContext<CartCtx | null>(null);

// ✅ đổi logic này theo app của bạn
function getToken() {
  if (typeof document === "undefined") return null;
  // ví dụ cookie "auth_token"
  const m = document.cookie.match(/(?:^|;\s*)auth_token=([^;]+)/);
  return m?.[1] || null;
}

const MERGE_ON_LOGIN = false; // nếu muốn gộp local -> server khi login, bật true

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [items, setItems] = useState<CartCtx["items"]>([]);
  const [loading, setLoading] = useState(true);

  const readServer = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/cart", { cache: "no-store", credentials: "include" });
      if (!res.ok) { setItems([]); return; }
      const data = await res.json();
      const cart = data?.cart ?? data;
      const mapped: CartCtx["items"] = (cart?.items ?? []).map((it: ServerCartItem) => ({
        id: String(it.id),
        name: it.productName ?? it.productSku ?? "",
        price: Number(it.unitPrice || 0),
        qty: Number(it.quantity || 1),
        image: (it as any).productImage,
        slug: it.productSlug,
        sku: it.productSku,
        isServer: true,
      }));
      setItems(mapped);
    } finally { setLoading(false); }
  }, []);

  const readLocal = useCallback(() => {
    const ls = ls_get();
    const mapped: CartCtx["items"] = ls.map((it) => ({
      id: it.id,
      name: it.name,
      price: it.price,
      qty: it.qty,
      image: it.image,
      slug: it.slug,
      sku: it.sku,
      isServer: false,
    }));
    setItems(mapped);
    setLoading(false);
  }, []);

  const refresh = useCallback(async () => {
    const token = getToken();
    const logged = !!token;
    setIsLoggedIn(logged);
    if (logged) await readServer(); else readLocal();
  }, [readLocal, readServer]);

  // Initial load + on token change (đơn giản: mỗi mount đọc token một lần)
  useEffect(() => { refresh(); }, [refresh]);

  // API ops
  const add = useCallback<CartCtx["add"]>(async (p) => {
    if (!isLoggedIn) {
      ls_add({ sku: p.sku, name: p.name, price: p.price, image: p.image, slug: p.slug, qty: p.qty ?? 1 });
      readLocal();
    } else {
      await fetch("/api/cart/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ sku: p.sku, quantity: p.qty ?? 1 }),
      });
      await readServer();
    }
  }, [isLoggedIn, readLocal, readServer]);

  const setQty = useCallback<CartCtx["setQty"]>(async (id, qty) => {
    if (!isLoggedIn) {
      ls_setQty(id, qty);
      readLocal();
    } else {
      await fetch(`/api/cart/items/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ quantity: qty }),
      });
      await readServer();
    }
  }, [isLoggedIn, readLocal, readServer]);

  const remove = useCallback<CartCtx["remove"]>(async (id) => {
    if (!isLoggedIn) {
      ls_remove(id);
      readLocal();
    } else {
      await fetch(`/api/cart/items/${encodeURIComponent(id)}`, {
        method: "DELETE",
        credentials: "include",
      });
      await readServer();
    }
  }, [isLoggedIn, readLocal, readServer]);

  const value = useMemo<CartCtx>(() => ({
    items, loading, add, setQty, remove, refresh, isLoggedIn,
  }), [items, loading, add, setQty, remove, refresh, isLoggedIn]);

  // 🚀 Xử lý sự kiện đăng nhập/đăng xuất:
  // - Khi phát hiện token xuất hiện: (tùy chọn) merge local -> server rồi clear local
  useEffect(() => {
    if (!isLoggedIn) return;
    (async () => {
      const local = ls_get();
      if (local.length === 0) return;
      if (MERGE_ON_LOGIN) {
        for (const it of local) {
          await fetch("/api/cart/items", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ sku: it.sku, quantity: it.qty }),
          });
        }
      }
      ls_clear(); // theo yêu cầu: login thì KHÔNG dùng local
      await readServer();
    })();
  }, [isLoggedIn, readServer]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
