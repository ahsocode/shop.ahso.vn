"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ImageIcon, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { confirmToast } from "@/lib/confirm-toast";
import { makeHeaders } from "@/app/admin/_lib/fetcher";

type HeroBanner = {
  id: string;
  imageUrl: string;
  title: string | null;
  content: string | null;
  ctaLabel: string | null;
  ctaHref: string | null;
  sortOrder: number;
  isActive: boolean;
  overlayOn: boolean;
  overlayColor: string | null;
  textColor: string | null;
  textPosition:
    | "TOP_LEFT"
    | "TOP_RIGHT"
    | "MIDDLE_LEFT"
    | "MIDDLE_RIGHT"
    | "BOTTOM_LEFT"
    | "BOTTOM_RIGHT";
};

const fetchJSON = async <T,>(url: string): Promise<T> => {
  const res = await fetch(url, { headers: makeHeaders() });
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()) as T;
};

export default function HeroBannersPage() {
  const [pageLoading, setPageLoading] = useState(true);
  const [heroBanners, setHeroBanners] = useState<HeroBanner[]>([]);
  const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      try {
        const bannerData = await fetchJSON<{ data: HeroBanner[] }>("/api/admin/hero-banners");
        if (ignore) return;
        setHeroBanners(bannerData.data ?? []);
      } catch (error) {
        console.error("Failed to load hero banners", error);
        toast.error("Không tải được dữ liệu banner.");
      } finally {
        if (!ignore) setPageLoading(false);
      }
    };
    load();
    return () => {
      ignore = true;
    };
  }, []);

  const updateLoadingMap = (key: string, value: boolean) =>
    setLoadingMap((prev) => ({ ...prev, [key]: value }));

  async function handleDeleteBanner(id: string) {
    const confirmed = await confirmToast("Xóa banner này?", { variant: "modal" });
    if (!confirmed) return;
    updateLoadingMap(`banner-${id}`, true);
    try {
      const res = await fetch(`/api/admin/hero-banners/${id}`, {
        method: "DELETE",
        headers: makeHeaders(),
      });
      if (!res.ok) throw new Error(await res.text());
      setHeroBanners((prev) => prev.filter((b) => b.id !== id));
      toast.success("Đã xóa banner.");
    } catch (error) {
      console.error("Failed to delete banner", error);
      toast.error("Không thể xóa banner.");
    } finally {
      updateLoadingMap(`banner-${id}`, false);
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Banner trang chủ</h1>
          <p className="text-gray-600">Quản lý danh sách banner hero hiển thị ở trang chủ.</p>
        </div>
        <Link
          href="/admin/system/hero-banners/new"
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Tạo banner mới
        </Link>
      </header>

      {pageLoading ? (
        <div className="flex items-center gap-2 text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Đang tải dữ liệu...
        </div>
      ) : (
        <section className="rounded-2xl border bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-blue-500" />
            <h2 className="text-lg font-semibold text-gray-900">Danh sách banner</h2>
          </div>

          {heroBanners.length === 0 ? (
            <div className="rounded-xl border border-dashed p-6 text-center text-sm text-gray-500">
              Chưa có banner nào. Hãy tạo banner mới để hiển thị ở trang chủ.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {heroBanners.map((banner) => (
                <div key={banner.id} className="rounded-2xl border border-gray-200 p-4 space-y-3">
                  <div className="relative h-40 w-full overflow-hidden rounded-xl border bg-gray-50">
                    {banner.imageUrl ? (
                      <Image
                        src={banner.imageUrl}
                        alt={banner.title || "Hero banner"}
                        fill
                        sizes="360px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs text-gray-400">
                        Chưa có ảnh
                      </div>
                    )}
                  </div>
                  <div className="space-y-1">
                    <div className="font-semibold text-gray-900 line-clamp-1">
                      {banner.title || "Không có tiêu đề"}
                    </div>
                    <div className="text-xs text-gray-500">
                      Thứ tự: {banner.sortOrder} · {banner.isActive ? "Đang hiển thị" : "Ẩn"}
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <Link
                      href={`/admin/system/hero-banners/${banner.id}`}
                      className="inline-flex items-center gap-1 rounded-xl border border-gray-200 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Chỉnh sửa
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleDeleteBanner(banner.id)}
                      className="inline-flex items-center gap-1 rounded-xl border border-red-200 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50"
                      disabled={loadingMap[`banner-${banner.id}`]}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Xóa
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
