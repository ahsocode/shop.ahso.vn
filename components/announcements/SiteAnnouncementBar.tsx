"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";

type Announcement = {
  id: string;
  title: string | null;
  content: string | null;
  imageUrl: string | null;
  ctaLabel: string | null;
  ctaHref: string | null;
  showOnVisit: boolean;
};

type Props = {
  className?: string;
  compact?: boolean;
};

export function SiteAnnouncementBar({ className = "", compact = false }: Props) {
  const [items, setItems] = useState<Announcement[]>([]);

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      try {
        const res = await fetch("/api/announcements");
        if (!res.ok) return;
        const json = (await res.json()) as { data?: Announcement[] };
        if (ignore) return;
        setItems(Array.isArray(json.data) ? json.data : []);
      } catch {
        if (!ignore) setItems([]);
      }
    };
    load();
    return () => {
      ignore = true;
    };
  }, []);

  const visible = items.filter((item) => item.showOnVisit);
  const primary = visible[0];
  if (!primary) return null;

  const title = primary.title?.trim();
  const content = primary.content?.trim();
  const ctaLabel = primary.ctaLabel?.trim();
  const ctaHref = primary.ctaHref?.trim();

  return (
    <section className={`bg-white ${className}`.trim()}>
      <div
        className={`mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 ${
          compact ? "py-4" : "py-8"
        }`}
      >
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 md:p-6 flex flex-col md:flex-row gap-4 md:gap-6 items-start">
          {primary.imageUrl && (
            <div className="relative w-full md:w-64 aspect-[4/3] rounded-xl overflow-hidden border border-slate-200 bg-white">
              <Image
                src={primary.imageUrl}
                alt={title || "Banner quảng cáo"}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 280px"
              />
            </div>
          )}
          <div className="flex-1 min-w-0">
            {title && (
              <h3 className="text-lg md:text-xl font-semibold text-slate-900">
                {title}
              </h3>
            )}
            {content && (
              <p className="mt-2 text-sm md:text-base text-slate-700 leading-relaxed">
                {content}
              </p>
            )}
            {ctaLabel && ctaHref && (
              <Link
                href={ctaHref}
                className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-slate-900"
              >
                {ctaLabel}
                <span aria-hidden="true">→</span>
              </Link>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
