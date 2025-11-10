"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

type Item = {
  id: string;
  slug: string;
  title: string;
  summary?: string | null;
  image?: string | null;
  industry?: string | null; // hiển thị "Ngành"
  usecase?: string | null;  // hiển thị "Phân loại"
};

export default function SimilarSolutionsCarousel({
  industry,
  excludeSlug,
  limit = 12,
}: {
  industry?: string | null;
  excludeSlug: string;
  limit?: number;
}) {
  const [items, setItems] = useState<Item[]>([]);
  const [cursor, setCursor] = useState(0);
  const timer = useRef<NodeJS.Timeout | null>(null);

  // Tạo query string một lần theo deps
  const qs = useMemo(() => {
    if (!industry) return "";
    const p = new URLSearchParams();
    p.set("industry", industry);
    p.set("exclude", excludeSlug);
    p.set("limit", String(limit));
    return p.toString();
  }, [industry, excludeSlug, limit]);

  // Fetch similar (supports ?mock=1 to use local JSON)
  useEffect(() => {
    let aborted = false;
    if (!industry) return;

    let url = `/api/solution/similar?${qs}`;
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      if (sp.get("mock") === "1") {
        url = "/mock/similar-solutions.json";
      }
    }

    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((json) => {
        if (!aborted) setItems((json?.data ?? []) as Item[]);
      })
      .catch(() => {
        if (!aborted) setItems([]);
      });

      return () => {
        aborted = true;
      };
    }, [qs, industry]);

  // Auto-slide mỗi 3.5s
  useEffect(() => {
    if (!items.length) return;
    if (timer.current) clearInterval(timer.current);
    timer.current = setInterval(() => {
      setCursor((i) => (i + 1) % items.length);
    }, 3500);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [items.length]);

  if (!industry) return null;
  if (!items.length) return <p className="text-gray-600">Chưa có giải pháp cùng ngành.</p>;

  const visibleCount = 4; // số card hiển thị trên desktop
  const getVisible = (): Item[] => {
    const arr: Item[] = [];
    for (let i = 0; i < Math.min(visibleCount, items.length); i++) {
      arr.push(items[(cursor + i) % items.length]);
    }
    return arr;
  };

  const prev = () => setCursor((i) => (i - 1 + items.length) % items.length);
  const next = () => setCursor((i) => (i + 1) % items.length);

  return (
    <div className="relative">
      <div className="flex gap-4 overflow-hidden">
        {getVisible().map((it) => (
          <article
            key={it.id}
            className="group shrink-0 w-full sm:w-[48%] lg:w-[24%] border rounded-xl p-4 bg-white shadow-sm hover:shadow-md transition flex flex-col"
          >
            {/* Ảnh bìa 16:9 bo góc, đồng bộ card ngoài */}
            <Link href={`/solutions/${it.slug}`} className="block">
              <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-gray-100">
                <img
                  src={it.image ?? "/logo.png"}
                  alt={it.title}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />
              </div>
            </Link>

            {/* Nội dung */}
            <div className="mt-3 flex-1 flex flex-col">
              <h3 className="font-semibold line-clamp-2">{it.title}</h3>

              {/* Ngành - Phân loại */}
              <p className="mt-1 text-sm text-gray-600 line-clamp-1">
                {(it.industry || "—") + " - " + (it.usecase || "—")}
              </p>

              {/* Nút giống thẻ ngoài, cố định đáy thẻ */}
              <Link
                href={`/solutions/${it.slug}`}
                className="mt-auto inline-block rounded-md bg-blue-600 text-white px-4 py-2 text-sm font-semibold hover:bg-blue-700"
              >
                Xem chi tiết
              </Link>
            </div>
          </article>
        ))}
      </div>

      {/* Nút điều hướng đặt ra ngoài để không đè card khi ít item */}
      <button
        aria-label="Trước"
        onClick={prev}
        className="absolute -left-4 sm:-left-6 top-1/2 -translate-y-1/2 z-10 bg-white/95 rounded-full p-2 shadow border border-gray-200 hover:bg-white"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>
      <button
        aria-label="Sau"
        onClick={next}
        className="absolute -right-4 sm:-right-6 top-1/2 -translate-y-1/2 z-10 bg-white/95 rounded-full p-2 shadow border border-gray-200 hover:bg-white"
      >
        <ChevronRight className="w-5 h-5" />
      </button>
    </div>
  );
}
