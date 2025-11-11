"use client";
import { useCart } from "@/lib/hooks/useCart";
import { useState } from "react";
type Props = {
  sku: string;
  name: string;
  price: number;
  image?: string;
  slug?: string;
  qty?: number;
  className?: string;
  disabled?: boolean;
  children?: React.ReactNode;
};

export default function AddToCartClient(props: Props) {
  const { add } = useCart();
  const [loading, setLoading] = useState(false);

  async function onClick() {
    if (loading || props.disabled) return;
    setLoading(true);
    try {
      await add({
        sku: props.sku,
        name: props.name,
        price: props.price,
        image: props.image,
        slug: props.slug,
        qty: props.qty ?? 1,
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={onClick}
      disabled={loading || !!props.disabled}
      className={
        props.className ??
        "rounded-md bg-blue-600 text-white px-3 py-2 text-sm font-semibold hover:bg-blue-700 disabled:opacity-60"
      }
      title={props.disabled ? "Hết hàng" : "Thêm vào giỏ"}
    >
      {props.children ?? (loading ? "Đang thêm..." : "Thêm vào giỏ")}
    </button>
  );
}
