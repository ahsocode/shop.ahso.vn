"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { DragEvent } from "react";
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
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [reorderLoading, setReorderLoading] = useState(false);

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      try {
        const bannerData = await fetchJSON<{ data: HeroBanner[] }>("/api/admin/hero-banners");
        if (ignore) return;
        setHeroBanners((bannerData.data ?? []).sort((a, b) => a.sortOrder - b.sortOrder));
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

  const persistOrder = async (next: HeroBanner[]) => {
    const updates = next.map((banner, index) => ({
      id: banner.id,
      sortOrder: index + 1,
    }));
    const changed = updates.filter((update) => {
      const existing = heroBanners.find((b) => b.id === update.id);
      return !existing || existing.sortOrder !== update.sortOrder;
    });
    if (changed.length === 0) return;

    setReorderLoading(true);
    try {
      await Promise.all(
        changed.map((update) =>
          fetch(`/api/admin/hero-banners/${update.id}`, {
            method: "PATCH",
            headers: makeHeaders(),
            body: JSON.stringify({ sortOrder: update.sortOrder }),
          }).then(async (res) => {
            if (!res.ok) throw new Error(await res.text());
          })
        )
      );
      setHeroBanners((prev) =>
        prev
          .map((banner) => {
            const update = updates.find((u) => u.id === banner.id);
            return update ? { ...banner, sortOrder: update.sortOrder } : banner;
          })
          .sort((a, b) => a.sortOrder - b.sortOrder)
      );
      toast.success("Đã cập nhật thứ tự banner.");
    } catch (error) {
      console.error("Failed to update banner order", error);
      toast.error("Không thể cập nhật thứ tự banner.");
    } finally {
      setReorderLoading(false);
    }
  };

  const handleDragStart = (id: string) => (e: DragEvent<HTMLDivElement>) => {
    setDraggingId(id);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", id);
  };

  const handleDragOver = (id: string) => (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOverId(id);
  };

  const handleDrop = (targetId: string) => async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const sourceId = draggingId || e.dataTransfer.getData("text/plain");
    setDragOverId(null);
    setDraggingId(null);
    if (!sourceId || sourceId === targetId) return;

    const sourceIndex = heroBanners.findIndex((b) => b.id === sourceId);
    const targetIndex = heroBanners.findIndex((b) => b.id === targetId);
    if (sourceIndex < 0 || targetIndex < 0) return;

    const next = [...heroBanners];
    const [moved] = next.splice(sourceIndex, 1);
    next.splice(targetIndex, 0, moved);
    setHeroBanners(next);
    await persistOrder(next);
  };

  const handleDragEnd = () => {
    setDragOverId(null);
    setDraggingId(null);
  };

  const handleSortOrderChange = (id: string, value: string) => {
    const nextValue = Number(value);
    if (!Number.isFinite(nextValue)) return;
    setHeroBanners((prev) =>
      prev.map((banner) =>
        banner.id === id ? { ...banner, sortOrder: nextValue } : banner
      )
    );
  };

  const handleSortOrderCommit = async (id: string) => {
    const current = heroBanners.find((banner) => banner.id === id);
    if (!current) return;
    updateLoadingMap(`sort-${id}`, true);
    try {
      const res = await fetch(`/api/admin/hero-banners/${id}`, {
        method: "PATCH",
        headers: makeHeaders(),
        body: JSON.stringify({ sortOrder: current.sortOrder }),
      });
      if (!res.ok) throw new Error(await res.text());
      setHeroBanners((prev) => [...prev].sort((a, b) => a.sortOrder - b.sortOrder));
      toast.success("Đã cập nhật thứ tự.");
    } catch (error) {
      console.error("Failed to update sort order", error);
      toast.error("Không thể cập nhật thứ tự.");
    } finally {
      updateLoadingMap(`sort-${id}`, false);
    }
  };

  const handleToggleStatus = async (banner: HeroBanner, nextValue: boolean) => {
    updateLoadingMap(`status-${banner.id}`, true);
    try {
      const res = await fetch(`/api/admin/hero-banners/${banner.id}`, {
        method: "PATCH",
        headers: makeHeaders(),
        body: JSON.stringify({ isActive: nextValue }),
      });
      if (!res.ok) throw new Error(await res.text());
      setHeroBanners((prev) =>
        prev.map((b) => (b.id === banner.id ? { ...b, isActive: nextValue } : b))
      );
      toast.success("Đã cập nhật trạng thái.");
    } catch (error) {
      console.error("Failed to update status", error);
      toast.error("Không thể cập nhật trạng thái.");
    } finally {
      updateLoadingMap(`status-${banner.id}`, false);
    }
  };

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
                <div
                  key={banner.id}
                  className={`rounded-2xl border border-gray-200 p-4 space-y-3 ${
                    dragOverId === banner.id ? "border-blue-400 ring-2 ring-blue-100" : ""
                  }`}
                  draggable
                  onDragStart={handleDragStart(banner.id)}
                  onDragOver={handleDragOver(banner.id)}
                  onDrop={handleDrop(banner.id)}
                  onDragEnd={handleDragEnd}
                >
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
                    <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                      <span>Thứ tự:</span>
                      <input
                        type="number"
                        min={0}
                        value={banner.sortOrder}
                        onChange={(e) => handleSortOrderChange(banner.id, e.target.value)}
                        onBlur={() => handleSortOrderCommit(banner.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            (e.target as HTMLInputElement).blur();
                          }
                        }}
                        className="w-16 rounded border border-gray-200 px-2 py-1 text-xs"
                        disabled={loadingMap[`sort-${banner.id}`] || reorderLoading}
                      />
                      <span>·</span>
                      <label className="inline-flex items-center gap-2 text-xs text-gray-600">
                        <input
                          type="checkbox"
                          checked={banner.isActive}
                          onChange={(e) => handleToggleStatus(banner, e.target.checked)}
                          disabled={loadingMap[`status-${banner.id}`]}
                        />
                        {banner.isActive ? "Đang hiển thị" : "Ẩn"}
                      </label>
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
