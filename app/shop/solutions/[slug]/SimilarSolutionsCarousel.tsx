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

  const qs = useMemo(() => {
    if (!industry) return "";
    const p = new URLSearchParams();
    p.set("industry", industry);
    p.set("exclude", excludeSlug);
    p.set("limit", String(limit));
    return p.toString();
  }, [industry, excludeSlug, limit]);

  useEffect(() => {
  let aborted = false;
  if (!industry) return;
  const p = new URLSearchParams();
  p.set("industry", industry);
  p.set("exclude", excludeSlug);
  p.set("limit", String(limit));
  fetch(`/api/solutions/similar?${p.toString()}`)
    .then((r) => r.json())
    .then((json) => { if (!aborted) setItems(json.data ?? []); });
  return () => { aborted = true; };
}, [industry, excludeSlug, limit]);


  // Auto-slide mỗi 3.5s
  useEffect(() => {
    if (!items.length) return;
    timer.current && clearInterval(timer.current);
    timer.current = setInterval(() => {
      setCursor((i) => (i + 1) % items.length);
    }, 3500);
    return () => { timer.current && clearInterval(timer.current); };
  }, [items.length]);

  if (!industry) return null;
  if (!items.length) return <p className="text-gray-600">Chưa có giải pháp cùng ngành.</p>;

  const visibleCount = 4; // desktop 4 card
  const getVisible = () => {
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
          <Link
            key={it.id}
            href={`/shop/solutions/${it.slug}`}
            className="group shrink-0 w-full sm:w-[48%] lg:w-[24%] border rounded-xl bg-white shadow-sm hover:shadow-md transition"
          >
            <div className="w-full h-40 bg-gray-100 rounded-t-xl overflow-hidden">
              <img
                src={it.image ?? "/logo.png"}
                alt={it.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                loading="lazy"
              />
            </div>
            <div className="p-3">
              <h3 className="font-semibold line-clamp-2">{it.title}</h3>
              {it.summary && <p className="text-sm text-gray-600 line-clamp-2 mt-1">{it.summary}</p>}
            </div>
          </Link>
        ))}
      </div>

      <button
        aria-label="Trước"
        onClick={prev}
        className="absolute left-0 top-1/2 -translate-y-1/2 bg-white/90 rounded-full p-2 shadow hover:bg-white"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>
      <button
        aria-label="Sau"
        onClick={next}
        className="absolute right-0 top-1/2 -translate-y-1/2 bg-white/90 rounded-full p-2 shadow hover:bg-white"
      >
        <ChevronRight className="w-5 h-5" />
      </button>
    </div>
  );
}
