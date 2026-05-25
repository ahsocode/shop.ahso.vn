"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

type FeaturedShowcaseItem = {
  id: string;
  title: string;
  summary: string | null;
  image: string;
  href: string;
  categoryName: string | null;
};

type FeaturedSolutionsShowcaseProps = {
  items: FeaturedShowcaseItem[];
};

const ROTATE_DELAY = 7800;
const FADE_DURATION = 360;
const LIST_ITEM_HEIGHT = 120;

export function FeaturedSolutionsShowcase({ items }: FeaturedSolutionsShowcaseProps) {
  const [displayIndex, setDisplayIndex] = useState(0);
  const [listOffset, setListOffset] = useState(items.length);
  const [isFading, setIsFading] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [listTransitionOn, setListTransitionOn] = useState(true);

  const activeItem = items[displayIndex] ?? items[0];
  const loopItems = useMemo(() => [...items, ...items, ...items], [items]);

  const changeTo = useCallback((nextIndex: number) => {
    if (!items.length || nextIndex === displayIndex || isFading) return;

    setIsFading(true);
    window.setTimeout(() => {
      setDisplayIndex(nextIndex);
      setIsFading(false);
    }, FADE_DURATION);
  }, [displayIndex, isFading, items.length]);

  const advance = useCallback(() => {
    if (items.length <= 1) return;
    const nextOffset = listOffset + 1;
    setListTransitionOn(true);
    setListOffset(nextOffset);
    changeTo(nextOffset % items.length);
  }, [changeTo, items.length, listOffset]);

  const jumpTo = useCallback((itemIndex: number) => {
    if (itemIndex === displayIndex || isFading) return;

    setListTransitionOn(true);
    setListOffset(items.length + itemIndex);
    changeTo(itemIndex);
  }, [changeTo, displayIndex, isFading, items.length]);

  useEffect(() => {
    if (items.length <= 1 || isPaused) return;

    const timer = window.setInterval(advance, ROTATE_DELAY);

    return () => window.clearInterval(timer);
  }, [advance, isPaused, items.length]);

  if (!activeItem) return null;

  return (
    <div
      className="grid overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm lg:grid-cols-[360px_minmax(0,1fr)_310px]"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <Link
        href={activeItem.href}
        className={`group relative aspect-square overflow-hidden bg-slate-100 transition-opacity duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
          isFading ? "opacity-0" : "opacity-100"
        }`}
      >
        <Image
          src={activeItem.image}
          alt={activeItem.title}
          fill
          className="object-cover transition duration-700 group-hover:scale-105"
          sizes="(max-width: 1024px) 100vw, 38vw"
          priority={displayIndex === 0}
        />
        <div className="absolute left-4 top-4 rounded-full border border-white/70 bg-white/90 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-blue-700">
          Nổi bật
        </div>
      </Link>

      <div
        className={`grid min-h-[320px] content-center gap-4 border-y border-slate-200 p-6 transition-all duration-300 lg:min-h-[360px] lg:border-x lg:border-y-0 lg:p-8 ${
          isFading ? "translate-y-2 opacity-0" : "translate-y-0 opacity-100"
        }`}
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-blue-700">
            Nổi bật
          </span>
          {activeItem.categoryName && (
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              {activeItem.categoryName}
            </span>
          )}
        </div>
        <h3 className="text-2xl font-semibold leading-tight text-slate-950 sm:text-[2rem]">
          {activeItem.title}
        </h3>
        <p className="line-clamp-4 max-w-xl text-sm leading-7 text-slate-600 sm:text-base">
          {activeItem.summary ||
            "Thông tin được AHSO chọn lọc để khách hàng nhanh chóng hiểu phạm vi và giá trị triển khai."}
        </p>
        <Link
          href={activeItem.href}
          className="inline-flex w-fit items-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
        >
          Xem chi tiết
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="h-[360px] overflow-hidden border-slate-200 bg-slate-50/80 p-3">
        <div
          className={`grid gap-2 ${listTransitionOn ? "transition-transform duration-700 ease-out" : ""}`}
          style={{ transform: `translateY(-${Math.max(listOffset - 1, 0) * LIST_ITEM_HEIGHT}px)` }}
          onTransitionEnd={() => {
            if (items.length <= 1) return;

            if (listOffset >= items.length * 2) {
              setListTransitionOn(false);
              setListOffset(items.length + (listOffset % items.length));
              window.requestAnimationFrame(() => {
                window.requestAnimationFrame(() => setListTransitionOn(true));
              });
            }
          }}
        >
          {loopItems.map((item, index) => {
            const itemIndex = index % items.length;
            const isActive = itemIndex === displayIndex;

            return (
              <button
                key={`${item.id}-${index}`}
                type="button"
                onClick={() => jumpTo(itemIndex)}
                className={`group h-28 rounded-lg border p-3 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                  isActive
                    ? "border-blue-300 bg-white shadow-sm"
                    : "border-transparent bg-transparent hover:border-slate-200 hover:bg-white/80"
                }`}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${
                      isActive ? "bg-blue-700" : "bg-slate-300 group-hover:bg-blue-300"
                    }`}
                  />
                  <div className="min-w-0">
                    <p className="line-clamp-2 text-sm font-semibold leading-5 text-slate-950">
                      {item.title}
                    </p>
                    {item.categoryName && (
                      <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-blue-700">
                        {item.categoryName}
                      </p>
                    )}
                  </div>
                </div>
                {isActive && (
                  <div className="mt-3 h-1 overflow-hidden rounded-full bg-blue-100">
                    <div
                      key={displayIndex}
                      className="h-full rounded-full bg-blue-700 motion-safe:animate-[featured-progress_7.8s_linear]"
                    />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
