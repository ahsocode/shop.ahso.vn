"use client";

import Link from "next/link";
import Image from "next/image";
import { useMemo, useState } from "react";

type Item = {
  id: string;
  name: string;
  slug: string;
  price?: number | null;
  image: string;
  typeName?: string;
};

export default function RelatedCarousel({
  items,
  viewAllHref,
}: {
  items: Item[];
  viewAllHref?: string;
}) {
  const visible = useMemo(() => items.slice(0, 10), [items]);
  const [start, setStart] = useState(0);
  if (!visible.length) return null;

  const showCount = Math.min(3, visible.length);
  const itemWidthPercent = 100 / showCount;
  const next = () => setStart((idx) => (idx + 1) % visible.length);
  const prev = () => setStart((idx) => (idx - 1 + visible.length) % visible.length);

  return (
    <div className="relative">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold">Sản phẩm cùng loại</h3>
        <div className="flex items-center gap-3">
          {viewAllHref && (
            <Link href={viewAllHref} className="text-sm text-blue-600 hover:underline">
              Xem tất cả
            </Link>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              aria-label="Trước"
              onClick={prev}
              className="rounded-full border bg-white px-3 py-2 text-lg shadow hover:bg-gray-50"
            >
              ‹
            </button>
            <button
              type="button"
              aria-label="Tiếp"
              onClick={next}
              className="rounded-full border bg-white px-3 py-2 text-lg shadow hover:bg-gray-50"
            >
              ›
            </button>
          </div>
        </div>
      </div>
      <div className="relative rounded-xl bg-white p-3 shadow-sm overflow-hidden">
        <div
          className="flex gap-4 transition-transform duration-300 ease-out"
          style={{ transform: `translateX(-${start * itemWidthPercent}%)` }}
        >
          {visible.map((item) => (
            <Link
              key={item.id}
              href={`/shop/products/${item.slug}`}
              className="shrink-0 flex flex-col rounded-lg bg-white p-3 shadow hover:shadow-md transition"
              style={{ width: `${itemWidthPercent}%` }}
            >
              <div className="relative h-36 w-full overflow-hidden rounded-md bg-gray-50">
                <Image
                  src={item.image}
                  alt={item.name}
                  fill
                  className="object-contain"
                />
              </div>
              <div className="mt-2 text-xs text-gray-500">{item.typeName || "Cùng loại"}</div>
              <div className="text-sm font-semibold text-gray-900 line-clamp-2">
                {item.name}
              </div>
              <div className="mt-1 text-sm text-blue-700">
                {Number(item.price ?? 0).toLocaleString("vi-VN")}₫
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
