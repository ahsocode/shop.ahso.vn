// app/shop/products/[slug]/AddToCartClient.tsx
"use client";

import { useRef, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useCart } from "@/lib/hooks/useCart";

type Props = {
  sku: string;
  name?: string;
  image?: string;
  className?: string;
  disabled?: boolean;
  children?: ReactNode; // icon/text tuỳ biến
};

type CartErrorPayload = {
  error?: string;
  message?: string;
};

const extractError = (payload: unknown) => {
  if (typeof payload === "object" && payload !== null) {
    const { error, message } = payload as CartErrorPayload;
    if (typeof error === "string") return error;
    if (typeof message === "string") return message;
  }
  return undefined;
};

export default function AddToCartClient({
  sku,
  name,
  image,
  className,
  disabled,
  children,
}: Props) {
  const [loading, setLoading] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const router = useRouter();
  const { refresh: refreshCart } = useCart();

  async function handleAdd() {
    if (loading || disabled) return;

    try {
      setLoading(true);
      const res = await fetch("/api/cart/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ sku, qty: 1, name, image }),
      });

      // --- PHÂN NHÁNH TRẠNG THÁI ---
      if (res.status === 401) {
        // Chưa đăng nhập -> toast + nút Đăng nhập (giữ redirect)
        const redirect = typeof window !== "undefined" ? window.location.pathname : "/shop/products";
        toast.error("Bạn cần đăng nhập để thêm sản phẩm vào giỏ.", {
          action: {
            label: "Đăng nhập",
            onClick: () => router.push(`/login?redirect=${encodeURIComponent(redirect)}`),
          },
        });
        return;
      }

      if (!res.ok) {
        // Thử đọc thông điệp cụ thể từ server
        const body = (await res.json().catch(() => null)) as unknown;
        const err = (extractError(body) || "").toUpperCase();

        if (res.status === 409 || err.includes("OUT_OF_STOCK")) {
          toast.error("Sản phẩm tạm hết hàng.");
          return;
        }
        if (res.status === 422 || err.includes("VALIDATION")) {
          toast.error("Dữ liệu không hợp lệ. Vui lòng thử lại.");
          return;
        }

        throw new Error(extractError(body) || `Add to cart failed (${res.status})`);
      }

      // Thành công
      try {
        await refreshCart();
      } catch { /* ignore */ }

      toast.success("Đã thêm vào giỏ!", {
        description: name || sku,
        action: {
          label: "Xem giỏ",
          onClick: () => router.push("/cart"),
        },
      });
    } catch (error) {
      // Lỗi mạng/khác
      toast.error("Không thể thêm sản phẩm. Vui lòng thử lại.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      ref={btnRef}
      onClick={handleAdd}
      disabled={loading || !!disabled}
      aria-disabled={loading || !!disabled}
      className={
        className ??
        "rounded-md bg-blue-600 text-white px-3 py-2 text-sm font-semibold hover:bg-blue-700 disabled:opacity-60"
      }
      title={disabled ? "Hết hàng" : "Thêm vào giỏ"}
    >
      {children ?? (loading ? "Đang thêm…" : "Thêm vào giỏ")}
    </button>
  );
}
