"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";

type Item = { url: string; alt?: string | null };

export default function GallerySlider({
  images,
  fallback,
}: {
  images: Item[];
  fallback: string;
}) {
  const items = useMemo(() => {
    const valid = images.filter((img) => img.url);
    return valid.length ? valid : [{ url: fallback, alt: "Ảnh sản phẩm" }];
  }, [images, fallback]);

  const [active, setActive] = useState(0);
  const activeIndex = Math.min(active, Math.max(items.length - 1, 0));

  useEffect(() => {
    if (items.length <= 1) return;
    const timer = setInterval(() => {
      setActive((idx) => (idx + 1) % items.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [items.length]);

  const current = items[activeIndex] ?? items[0];

  return (
    <div className="space-y-3">
      <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-white border">
        <Image
          src={current.url}
          alt={current.alt || "Ảnh sản phẩm"}
          fill
          className="object-contain bg-white"
          priority
        />
        {items.length > 1 && (
          <>
            <button
              type="button"
              aria-label="Ảnh trước"
              onClick={() =>
                setActive((idx) => (idx - 1 + items.length) % items.length)
              }
              className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-2 shadow hover:bg-white"
            >
              ‹
            </button>
            <button
              type="button"
              aria-label="Ảnh tiếp"
              onClick={() => setActive((idx) => (idx + 1) % items.length)}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-2 shadow hover:bg-white"
            >
              ›
            </button>
          </>
        )}
      </div>
      {items.length > 1 && (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {items.map((img, idx) => (
            <button
              key={`${img.url}-${idx}`}
              type="button"
              onClick={() => setActive(idx)}
              className={`relative h-24 w-28 shrink-0 overflow-hidden rounded-lg border transition ${
                idx === activeIndex
                  ? "border-blue-500 ring-2 ring-blue-200"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <Image
                src={img.url}
                alt={img.alt || "Ảnh sản phẩm"}
                fill
                className="object-contain bg-white"
                sizes="120px"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
