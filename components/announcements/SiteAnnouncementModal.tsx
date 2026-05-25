"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { X } from "lucide-react";

type Announcement = {
  id: string;
  title: string | null;
  content: string | null;
  imageUrl: string | null;
  ctaLabel: string | null;
  ctaHref: string | null;
  showOnLogin: boolean;
  showOnVisit: boolean;
};

type Props = {
  className?: string;
};

export function SiteAnnouncementModal({ className = "" }: Props) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<Announcement | null>(null);

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      try {
        if (typeof window !== "undefined") {
          const seen = sessionStorage.getItem("announcement_seen");
          if (seen === "1") return;
        }
        const res = await fetch("/api/announcements");
        if (!res.ok) return;
        const json = (await res.json()) as { data?: Announcement[] };
        if (ignore) return;

        const list = Array.isArray(json.data) ? json.data : [];
        const loginFlag =
          typeof window !== "undefined" &&
          sessionStorage.getItem("announcement_login_success") === "1";

        const filtered = list.filter((item) =>
          loginFlag ? item.showOnLogin : item.showOnVisit,
        );
        const primary = filtered[0] ?? null;
        if (!primary) return;

        setData(primary);
        setOpen(true);

        if (loginFlag) {
          sessionStorage.removeItem("announcement_login_success");
        }
        sessionStorage.setItem("announcement_seen", "1");
      } catch {
        if (!ignore) {
          setData(null);
          setOpen(false);
        }
      }
    };
    load();
    return () => {
      ignore = true;
    };
  }, []);

  if (!open || !data) return null;

  const title = data.title?.trim();
  const content = data.content?.trim();
  const ctaLabel = data.ctaLabel?.trim();
  const ctaHref = data.ctaHref?.trim();

  return (
    <div
      className={`fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4 ${className}`.trim()}
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-3xl rounded-2xl bg-white shadow-2xl overflow-hidden">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="absolute right-3 top-3 z-10 rounded-full p-2 text-white/80 hover:bg-white/10"
          aria-label="Đóng"
        >
          <X className="h-5 w-5" />
        </button>
        <div className="relative aspect-[16/9] bg-slate-100">
          {data.imageUrl && (
            <Image
              src={data.imageUrl}
              alt={title || "Banner quảng cáo"}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 900px"
            />
          )}
          <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/30 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-5 md:p-6 text-white">
            {title && (
              <h3 className="text-lg md:text-2xl font-semibold drop-shadow">
                {title}
              </h3>
            )}
            {content && (
              <p className="mt-2 text-sm md:text-base text-white/90 leading-relaxed line-clamp-4">
                {content}
              </p>
            )}
            {ctaLabel && ctaHref && (
              <Link
                href={ctaHref}
                className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-white"
              >
                {ctaLabel}
                <span aria-hidden="true">→</span>
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
