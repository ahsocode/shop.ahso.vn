"use client";

import { useRef, useState } from "react";
import { PackageCheck } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

type Props = { sku: string; name?: string; image?: string; className?: string };

export default function AddToCartClient({ sku, name, image, className }: Props) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const [loading, setLoading] = useState(false);

  function flyToCart() {
    try {
      const btn = btnRef.current;
      const target = document.getElementById("site-cart-icon");
      if (!btn || !target) return;
      const start = btn.getBoundingClientRect();
      const end = target.getBoundingClientRect();

      const el = document.createElement(image ? "img" : "div");
      if (image) {
        (el as HTMLImageElement).src = image;
      } else {
        el.textContent = "🛒";
      }
      el.style.position = "fixed";
      el.style.left = `${start.left + start.width / 2}px`;
      el.style.top = `${start.top + start.height / 2}px`;
      el.style.width = image ? "40px" : "24px";
      el.style.height = image ? "40px" : "24px";
      el.style.borderRadius = "9999px";
      el.style.zIndex = "9999";
      el.style.pointerEvents = "none";
      el.style.transition = "transform 600ms cubic-bezier(0.22, 1, 0.36, 1), opacity 600ms";
      el.style.transform = "translate(-50%, -50%) scale(1)";
      document.body.appendChild(el);

      // Next frame animate to target
      requestAnimationFrame(() => {
        const dx = end.left + end.width / 2 - (start.left + start.width / 2);
        const dy = end.top + end.height / 2 - (start.top + start.height / 2);
        el.style.transform = `translate(${dx - 20}px, ${dy - 20}px) scale(0.4)`;
        el.style.opacity = "0.3";
      });

      setTimeout(() => {
        el.remove();
      }, 700);
    } catch {}
  }

  const handleAdd = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/cart/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sku, quantity: 1 }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data?.error || "Thêm vào giỏ thất bại");
        return;
      }
      flyToCart();
      toast.success(`Đã thêm "${name || sku}" vào giỏ hàng.`);
    } catch (e) {
      console.error(e);
      alert("Lỗi mạng. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      ref={btnRef}
      onClick={handleAdd}
      disabled={loading}
      className={
        className ||
        "flex-1 rounded-md bg-blue-600 text-white px-4 py-2 text-sm font-semibold hover:bg-blue-700 disabled:opacity-60"
      }
    >
      <PackageCheck className="inline h-4 w-4 mr-2" />
      {loading ? "Đang thêm..." : "Thêm vào giỏ"}
    </button>
  );
}
