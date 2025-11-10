// app/shop/products/[slug]/AddToCartClient.tsx
"use client";

import { useRef, useState } from "react";

type Props = {
  sku: string;
  name?: string;
  image?: string;
  className?: string;
  /** Cho phép vô hiệu hoá nút (ví dụ hết hàng) */
  disabled?: boolean;
  /** Tuỳ biến nội dung nút (icon + text). Nếu không truyền sẽ dùng mặc định */
  children?: React.ReactNode;
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
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || `Add to cart failed (${res.status})`);
      }
      // TODO: toast thành công nếu cần
    } catch (e) {
      console.error(e);
      // TODO: toast lỗi nếu cần
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
