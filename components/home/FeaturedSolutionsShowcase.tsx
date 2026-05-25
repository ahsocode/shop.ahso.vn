"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

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

export function FeaturedSolutionsShowcase({ items }: FeaturedSolutionsShowcaseProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const activeItem = items[activeIndex] ?? items[0];
  const visibleItems = useMemo(() => {
    if (items.length <= 1) {
      return items.map((item, itemIndex) => ({ item, itemIndex }));
    }

    return Array.from({ length: Math.min(items.length, 6) }, (_, index) => {
      const itemIndex = (activeIndex + index) % items.length;
      return {
        item: items[itemIndex],
        itemIndex,
      };
    });
  }, [activeIndex, items]);

  useEffect(() => {
    if (items.length <= 1 || isPaused) return;

    const timer = window.setInterval(() => {
      setActiveIndex((value) => (value + 1) % items.length);
    }, ROTATE_DELAY);

    return () => window.clearInterval(timer);
  }, [isPaused, items.length]);

  if (!activeItem) return null;

  return (
    <div
      className="grid overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm lg:grid-cols-[0.9fr_1.15fr_0.7fr]"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <Link
        key={`image-${activeItem.id}`}
        href={activeItem.href}
        className="group relative min-h-[240px] animate-[featured-fade_0.55s_ease-out] overflow-hidden bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 lg:min-h-[390px]"
      >
        <Image
          key={activeItem.image}
          src={activeItem.image}
          alt={activeItem.title}
          fill
          className="object-cover transition duration-700 group-hover:scale-105"
          sizes="(max-width: 1024px) 100vw, 38vw"
          priority={activeIndex === 0}
        />
        <div className="absolute left-4 top-4 rounded-full border border-white/70 bg-white/90 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-blue-700">
          Nổi bật
        </div>
      </Link>

      <div
        key={`copy-${activeItem.id}`}
        className="grid animate-[featured-fade-up_0.55s_ease-out] content-center gap-4 border-y border-slate-200 p-6 lg:border-x lg:border-y-0 lg:p-8"
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

      <div className="h-[300px] overflow-hidden border-slate-200 bg-slate-50/80 p-3 lg:h-[390px] lg:p-4">
        <div key={activeIndex} className="grid animate-[featured-list-slide_0.55s_ease-out] gap-2">
          {visibleItems.map(({ item, itemIndex }, index) => {
            const isActive = itemIndex === activeIndex;

            return (
              <button
                key={`${item.id}-${itemIndex}-${index}`}
                type="button"
                onClick={() => setActiveIndex(itemIndex)}
                className={`group rounded-lg border p-3 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
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
                      key={activeIndex}
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
