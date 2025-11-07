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

export default function SimilarSoftwareCarousel({
  category,
  excludeSlug,
  limit = 12,
}: {
  category?: { slug?: string | null; id?: string | null } | null;
  excludeSlug: string;
  limit?: number;
}) {
  const [items, setItems] = useState<Item[]>([]);
  const [cursor, setCursor] = useState(0);
  const timer = useRef<NodeJS.Timeout | null>(null);

  const qs = useMemo(() => {
    if (!category?.slug && !category?.id) return "";
    const p = new URLSearchParams();
    p.set("category", category?.slug || category?.id || "");
    p.set("exclude", excludeSlug);
    p.set("limit", String(limit));
    return p.toString();
  }, [category?.slug, category?.id, excludeSlug, limit]);

  useEffect(() => {
    let aborted = false;
    if (!qs) return;

    const url = `/api/software/similar?${qs}`;
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

    return () => { aborted = true; };
  }, [qs]);

  useEffect(() => {
    if (!items.length) return;
    if (timer.current) clearInterval(timer.current);
    timer.current = setInterval(() => {
      setCursor((i) => (i + 1) % items.length);
    }, 3500);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [items.length]);

  if (!category) return null;
  if (!items.length) return <p className="text-gray-600">Chưa có phần mềm tương tự.</p>;

  const visibleCount = 4;
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
            <Link href={`/software/${it.slug}`} className="block">
              <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-gray-100">
                <img
                  src={it.image ?? "/logo.png"}
                  alt={it.title}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />
              </div>
            </Link>

            <div className="mt-3 flex-1 flex flex-col">
              <h3 className="font-semibold line-clamp-2">{it.title}</h3>
              <Link
                href={`/software/${it.slug}`}
                className="mt-auto inline-block rounded-md bg-blue-600 text-white px-4 py-2 text-sm font-semibold hover:bg-blue-700"
              >
                Xem chi tiết
              </Link>
            </div>
          </article>
        ))}
      </div>

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
