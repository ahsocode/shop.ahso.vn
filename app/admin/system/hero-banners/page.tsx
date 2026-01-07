"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import {
  Loader2,
  Save,
  Plus,
  Trash2,
  ImageIcon,
  Upload,
} from "lucide-react";
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

type CloudAsset = {
  assetId: string;
  publicId: string;
  secureUrl: string;
  width: number;
  height: number;
  bytes: number;
  createdAt: string;
};

const fetchJSON = async <T,>(url: string): Promise<T> => {
  const res = await fetch(url, { headers: makeHeaders() });
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()) as T;
};

const sanitizeOptional = (value?: string | null) => {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : null;
};

const TEXT_POS_OPTIONS: { value: HeroBanner["textPosition"]; label: string }[] = [
  { value: "TOP_LEFT", label: "Trên - Trái" },
  { value: "TOP_RIGHT", label: "Trên - Phải" },
  { value: "MIDDLE_LEFT", label: "Giữa - Trái" },
  { value: "MIDDLE_RIGHT", label: "Giữa - Phải" },
  { value: "BOTTOM_LEFT", label: "Dưới - Trái" },
  { value: "BOTTOM_RIGHT", label: "Dưới - Phải" },
];

const resolveColorValue = (value?: string | null) => {
  if (typeof value === "string" && value.trim().length > 0 && value.startsWith("#")) {
    return value;
  }
  return "#0f172a";
};

export default function HeroBannersPage() {
  const [pageLoading, setPageLoading] = useState(true);
  const [heroBanners, setHeroBanners] = useState<HeroBanner[]>([]);
  const [newBanner, setNewBanner] = useState({
    imageUrl: "",
    title: "",
    content: "",
    ctaLabel: "",
    ctaHref: "",
    sortOrder: 0,
    overlayOn: false,
    overlayColor: "rgba(15,23,42,0.18)",
    textColor: "#ffffff",
    textPosition: "MIDDLE_LEFT" as HeroBanner["textPosition"],
  });
  const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});
  const [heroGalleryOpen, setHeroGalleryOpen] = useState(false);
  const [heroGalleryItems, setHeroGalleryItems] = useState<CloudAsset[]>([]);
  const [heroGalleryCursor, setHeroGalleryCursor] = useState<string | null>(null);
  const [heroGalleryLoading, setHeroGalleryLoading] = useState(false);
  const [heroGalleryError, setHeroGalleryError] = useState<string | null>(null);
  const [heroGalleryTarget, setHeroGalleryTarget] = useState<{ type: "existing" | "new"; id?: string }>({
    type: "new",
  });

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      try {
        const bannerData = await fetchJSON<{ data: HeroBanner[] }>("/api/admin/hero-banners");
        if (ignore) return;
        setHeroBanners(
          (bannerData.data ?? []).map((b) => ({
            ...b,
            overlayOn: b.overlayOn ?? false,
            overlayColor: b.overlayColor ?? null,
            textColor: b.textColor ?? null,
            textPosition: (b.textPosition as HeroBanner["textPosition"] | undefined) ?? "MIDDLE_LEFT",
          })),
        );
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

  const updateLocalBanner = (id: string, changes: Partial<HeroBanner>) => {
    setHeroBanners((prev) =>
      prev.map((banner) => (banner.id === id ? { ...banner, ...changes } : banner)),
    );
  };

  async function uploadHeroImageFile(
    file: File,
    target: { type: "existing" | "new"; id?: string },
  ) {
    const key = target.id ? `hero-upload-${target.id}` : "hero-upload-new";
    updateLoadingMap(key, true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/hero-banners/upload-image", {
        method: "POST",
        headers: makeHeaders(),
        body: fd,
      });
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      const url = json.url ?? json.secureUrl;
      if (!url) throw new Error("NO_URL");
      if (target.type === "existing" && target.id) {
        setHeroBanners((prev) =>
          prev.map((banner) => (banner.id === target.id ? { ...banner, imageUrl: url } : banner)),
        );
      } else {
        setNewBanner((prev) => ({ ...prev, imageUrl: url }));
      }
      toast.success("Đã tải ảnh banner.");
    } catch (error) {
      console.error("upload hero banner error", error);
      toast.error("Tải ảnh banner thất bại.");
    } finally {
      updateLoadingMap(key, false);
    }
  }

  async function loadHeroGallery(cursor?: string | null, append = false) {
    setHeroGalleryLoading(true);
    setHeroGalleryError(null);
    try {
      const qs = cursor ? `?cursor=${encodeURIComponent(cursor)}` : "";
      const res = await fetch(`/api/admin/hero-banners/gallery${qs}`, {
        headers: makeHeaders(),
      });
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      const data: CloudAsset[] = Array.isArray(json?.data) ? json.data : [];
      setHeroGalleryItems((prev) => (append ? [...prev, ...data] : data));
      setHeroGalleryCursor(json?.nextCursor ?? null);
    } catch (error) {
      console.error("Failed to load hero gallery", error);
      setHeroGalleryError("Không tải được thư viện banner.");
    } finally {
      setHeroGalleryLoading(false);
    }
  }

  function openHeroGallery(target: { type: "existing" | "new"; id?: string }) {
    setHeroGalleryTarget(target);
    setHeroGalleryItems([]);
    setHeroGalleryCursor(null);
    setHeroGalleryOpen(true);
    void loadHeroGallery(null, false);
  }

  function handleSelectHeroGallery(asset: CloudAsset) {
    const target = heroGalleryTarget;
    if (!target) return;
    if (target.type === "existing" && target.id) {
      setHeroBanners((prev) =>
        prev.map((banner) => (banner.id === target.id ? { ...banner, imageUrl: asset.secureUrl } : banner)),
      );
    } else {
      setNewBanner((prev) => ({ ...prev, imageUrl: asset.secureUrl }));
    }
    closeHeroGallery();
  }

  function closeHeroGallery() {
    setHeroGalleryOpen(false);
    setHeroGalleryTarget({ type: "new" });
    setHeroGalleryError(null);
  }

  async function handleSaveBanner(id: string) {
    const banner = heroBanners.find((b) => b.id === id);
    if (!banner) return;
    updateLoadingMap(`banner-${id}`, true);
    try {
      const payload = {
        imageUrl: banner.imageUrl.trim(),
        title: sanitizeOptional(banner.title),
        content: sanitizeOptional(banner.content),
        ctaLabel: sanitizeOptional(banner.ctaLabel),
        ctaHref: sanitizeOptional(banner.ctaHref),
        sortOrder: banner.sortOrder,
        isActive: banner.isActive,
        overlayOn: banner.overlayOn,
        overlayColor: sanitizeOptional(banner.overlayColor),
        textColor: sanitizeOptional(banner.textColor),
        textPosition: banner.textPosition,
      };

      const res = await fetch(`/api/admin/hero-banners/${id}`, {
        method: "PATCH",
        headers: makeHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success("Đã lưu banner.");
    } catch (error) {
      console.error("Failed to update banner", error);
      toast.error("Cập nhật banner thất bại.");
    } finally {
      updateLoadingMap(`banner-${id}`, false);
    }
  }

  async function handleDeleteBanner(id: string) {
    const confirmed = await confirmToast("Xóa banner này?");
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

  async function handleCreateBanner(e: React.FormEvent) {
    e.preventDefault();
    if (!newBanner.imageUrl.trim()) {
      toast.error("Vui lòng nhập URL ảnh banner.");
      return;
    }
    updateLoadingMap("create-banner", true);
    try {
      const payload = {
        imageUrl: newBanner.imageUrl.trim(),
        title: sanitizeOptional(newBanner.title),
        content: sanitizeOptional(newBanner.content),
        ctaLabel: sanitizeOptional(newBanner.ctaLabel),
        ctaHref: sanitizeOptional(newBanner.ctaHref),
        sortOrder: newBanner.sortOrder,
        isActive: true,
        overlayOn: newBanner.overlayOn,
        overlayColor: sanitizeOptional(newBanner.overlayColor),
        textColor: sanitizeOptional(newBanner.textColor),
        textPosition: newBanner.textPosition,
      };

      const res = await fetch("/api/admin/hero-banners", {
        method: "POST",
        headers: makeHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      setHeroBanners((prev) => [...prev, json.data]);
      setNewBanner({
        imageUrl: "",
        title: "",
        content: "",
        ctaLabel: "",
        ctaHref: "",
        sortOrder: 0,
        overlayOn: false,
        overlayColor: "rgba(15,23,42,0.45)",
        textColor: "#ffffff",
        textPosition: "MIDDLE_LEFT",
      });
      toast.success("Đã thêm banner mới.");
    } catch (error) {
      console.error("Failed to create banner", error);
      toast.error("Không thể thêm banner.");
    } finally {
      updateLoadingMap("create-banner", false);
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">Banner trang chủ</h1>
        <p className="text-gray-600">Quản lý banner hero hiển thị ở trang chủ.</p>
      </header>

      {pageLoading ? (
        <div className="flex items-center gap-2 text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Đang tải dữ liệu...
        </div>
      ) : (
        <section className="rounded-2xl border bg-white p-6 shadow-sm space-y-6">
          <div className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-blue-500" />
            <h2 className="text-lg font-semibold text-gray-900">Banner Hero trang chủ</h2>
          </div>
          <p className="text-sm text-gray-500">
            Quản lý ảnh và nội dung hiển thị ở khu vực Hero. Nếu để trống tiêu đề hoặc nội dung,
            hệ thống sẽ chỉ hiển thị hình ảnh.
          </p>

          <div className="space-y-4 max-h-[540px] overflow-y-auto pr-2">
            {heroBanners.map((banner) => {
              const uploadKey = `hero-upload-${banner.id}`;
              const heroUploading = loadingMap[uploadKey];
              return (
                <div key={banner.id} className="rounded-2xl border border-gray-200 p-4 space-y-3">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-gray-600">Ảnh banner</label>
                      <div className="relative h-32 w-full overflow-hidden rounded-xl border bg-gray-50">
                        {banner.imageUrl ? (
                          <Image
                            src={banner.imageUrl}
                            alt={banner.title || "Hero banner"}
                            fill
                            sizes="320px"
                            className="object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-xs text-gray-400">
                            Chưa có ảnh
                          </div>
                        )}
                      </div>
                      <input
                        value={banner.imageUrl}
                        onChange={(e) => updateLocalBanner(banner.id, { imageUrl: e.target.value })}
                        className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm"
                        placeholder="https://..."
                      />
                      <div className="flex flex-wrap gap-2 text-xs text-gray-600">
                        <button
                          type="button"
                          onClick={() => openHeroGallery({ type: "existing", id: banner.id })}
                          className="rounded border px-3 py-1.5 hover:bg-gray-50"
                        >
                          Chọn từ thư viện
                        </button>
                        <label
                          htmlFor={`hero-upload-${banner.id}`}
                          className="inline-flex items-center gap-1 rounded border px-3 py-1.5 hover:bg-gray-50 cursor-pointer"
                        >
                          <Upload className="h-3.5 w-3.5" /> Tải ảnh
                          <input
                            id={`hero-upload-${banner.id}`}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                void uploadHeroImageFile(file, { type: "existing", id: banner.id });
                              }
                              if (e.target) e.target.value = "";
                            }}
                          />
                        </label>
                        {heroUploading && (
                          <span className="flex items-center gap-1 text-blue-600">
                            <Loader2 className="h-3 w-3 animate-spin" /> Đang tải...
                          </span>
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600">Tiêu đề</label>
                      <input
                        value={banner.title ?? ""}
                        onChange={(e) => updateLocalBanner(banner.id, { title: e.target.value })}
                        className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                  <textarea
                    placeholder="Nội dung (tùy chọn)"
                    value={banner.content ?? ""}
                    onChange={(e) => updateLocalBanner(banner.id, { content: e.target.value })}
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm"
                  />
                  <div className="grid gap-4 md:grid-cols-3">
                    <input
                      placeholder="CTA label"
                      value={banner.ctaLabel ?? ""}
                      onChange={(e) => updateLocalBanner(banner.id, { ctaLabel: e.target.value })}
                      className="rounded-xl border border-gray-300 px-3 py-2 text-sm"
                    />
                    <input
                      placeholder="CTA link"
                      value={banner.ctaHref ?? ""}
                      onChange={(e) => updateLocalBanner(banner.id, { ctaHref: e.target.value })}
                      className="rounded-xl border border-gray-300 px-3 py-2 text-sm"
                    />
                    <input
                      type="number"
                      min={0}
                      placeholder="Thứ tự"
                      value={banner.sortOrder}
                      onChange={(e) => updateLocalBanner(banner.id, { sortOrder: Number(e.target.value) })}
                      className="rounded-xl border border-gray-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="grid gap-4 md:grid-cols-3 items-center">
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={banner.overlayOn}
                        onChange={(e) => updateLocalBanner(banner.id, { overlayOn: e.target.checked })}
                      />
                      Phủ nền trên ảnh
                    </label>
                    <div>
                      <label className="text-xs font-medium text-gray-600">Màu nền phủ</label>
                      <div className="mt-1 flex items-center gap-2">
                        <input
                          type="color"
                          value={resolveColorValue(banner.overlayColor)}
                          onChange={(e) => updateLocalBanner(banner.id, { overlayColor: e.target.value })}
                          className="h-10 w-14 rounded border border-gray-300"
                          disabled={!banner.overlayOn}
                        />
                        <input
                          type="text"
                          placeholder="rgba(...) hoặc #hex"
                          value={banner.overlayColor ?? ""}
                          onChange={(e) => updateLocalBanner(banner.id, { overlayColor: e.target.value })}
                          className="flex-1 rounded-xl border border-gray-300 px-3 py-2 text-sm"
                          disabled={!banner.overlayOn}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600">Màu chữ</label>
                      <div className="mt-1 flex items-center gap-2">
                        <input
                          type="color"
                          value={resolveColorValue(banner.textColor)}
                          onChange={(e) => updateLocalBanner(banner.id, { textColor: e.target.value })}
                          className="h-10 w-14 rounded border border-gray-300"
                        />
                        <input
                          type="text"
                          placeholder="rgba(...) hoặc #hex"
                          value={banner.textColor ?? ""}
                          onChange={(e) => updateLocalBanner(banner.id, { textColor: e.target.value })}
                          className="flex-1 rounded-xl border border-gray-300 px-3 py-2 text-sm"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600">Vị trí chữ</label>
                      <select
                        value={banner.textPosition}
                        onChange={(e) =>
                          updateLocalBanner(banner.id, {
                            textPosition: e.target.value as HeroBanner["textPosition"],
                          })
                        }
                        className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm"
                      >
                        {TEXT_POS_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-sm text-gray-600">
                      <input
                        type="checkbox"
                        checked={banner.isActive}
                        onChange={(e) => updateLocalBanner(banner.id, { isActive: e.target.checked })}
                      />
                      Hiển thị
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleDeleteBanner(banner.id)}
                        className="inline-flex items-center gap-1 rounded-xl border border-red-200 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50"
                        disabled={loadingMap[`banner-${banner.id}`]}
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Xóa
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveBanner(banner.id)}
                        className="inline-flex items-center gap-1 rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                        disabled={loadingMap[`banner-${banner.id}`]}
                      >
                        {loadingMap[`banner-${banner.id}`] ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Save className="h-3.5 w-3.5" />
                        )}
                        Lưu
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <form onSubmit={handleCreateBanner} className="border-t pt-4 space-y-3">
            <div className="font-semibold text-gray-900 flex items-center gap-2">
              <Plus className="h-4 w-4" /> Thêm banner mới
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-600">Ảnh banner</label>
                <div className="relative h-32 w-full overflow-hidden rounded-xl border bg-gray-50">
                  {newBanner.imageUrl ? (
                    <Image
                      src={newBanner.imageUrl}
                      alt="Hero preview"
                      fill
                      sizes="320px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-gray-400">
                      Chưa có ảnh
                    </div>
                  )}
                </div>
                <input
                  placeholder="https://..."
                  value={newBanner.imageUrl}
                  onChange={(e) => setNewBanner((prev) => ({ ...prev, imageUrl: e.target.value }))}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm"
                  required
                />
                <div className="flex flex-wrap gap-2 text-xs text-gray-600">
                  <button
                    type="button"
                    onClick={() => openHeroGallery({ type: "new" })}
                    className="rounded border px-3 py-1.5 hover:bg-gray-50"
                  >
                    Chọn từ thư viện
                  </button>
                  <label
                    htmlFor="hero-upload-new"
                    className="inline-flex items-center gap-1 rounded border px-3 py-1.5 hover:bg-gray-50 cursor-pointer"
                  >
                    <Upload className="h-3.5 w-3.5" /> Tải ảnh
                    <input
                      id="hero-upload-new"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void uploadHeroImageFile(file, { type: "new" });
                        if (e.target) e.target.value = "";
                      }}
                    />
                  </label>
                  {loadingMap["hero-upload-new"] && (
                    <span className="flex items-center gap-1 text-blue-600">
                      <Loader2 className="h-3 w-3 animate-spin" /> Đang tải...
                    </span>
                  )}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Tiêu đề</label>
                <input
                  placeholder="Tiêu đề"
                  value={newBanner.title}
                  onChange={(e) => setNewBanner((prev) => ({ ...prev, title: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
            </div>
            <textarea
              placeholder="Nội dung"
              value={newBanner.content}
              onChange={(e) => setNewBanner((prev) => ({ ...prev, content: e.target.value }))}
              className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm"
            />
            <div className="grid gap-4 md:grid-cols-3">
              <input
                placeholder="CTA label"
                value={newBanner.ctaLabel}
                onChange={(e) => setNewBanner((prev) => ({ ...prev, ctaLabel: e.target.value }))}
                className="rounded-xl border border-gray-300 px-3 py-2 text-sm"
              />
              <input
                placeholder="CTA link"
                value={newBanner.ctaHref}
                onChange={(e) => setNewBanner((prev) => ({ ...prev, ctaHref: e.target.value }))}
                className="rounded-xl border border-gray-300 px-3 py-2 text-sm"
              />
              <input
                type="number"
                min={0}
                placeholder="Thứ tự"
                value={newBanner.sortOrder}
                onChange={(e) => setNewBanner((prev) => ({ ...prev, sortOrder: Number(e.target.value) }))}
                className="rounded-xl border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="grid gap-4 md:grid-cols-3 items-center">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={newBanner.overlayOn}
                  onChange={(e) => setNewBanner((prev) => ({ ...prev, overlayOn: e.target.checked }))}
                />
                Phủ nền trên ảnh
              </label>
              <div>
                <label className="text-xs font-medium text-gray-600">Màu nền phủ</label>
                <div className="mt-1 flex items-center gap-2">
                  <input
                    type="color"
                    value={resolveColorValue(newBanner.overlayColor)}
                    onChange={(e) => setNewBanner((prev) => ({ ...prev, overlayColor: e.target.value }))}
                    className="h-10 w-14 rounded border border-gray-300"
                    disabled={!newBanner.overlayOn}
                  />
                  <input
                    type="text"
                    placeholder="rgba(...) hoặc #hex"
                    value={newBanner.overlayColor}
                    onChange={(e) => setNewBanner((prev) => ({ ...prev, overlayColor: e.target.value }))}
                    className="flex-1 rounded-xl border border-gray-300 px-3 py-2 text-sm"
                    disabled={!newBanner.overlayOn}
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Màu chữ</label>
                <div className="mt-1 flex items-center gap-2">
                  <input
                    type="color"
                    value={resolveColorValue(newBanner.textColor)}
                    onChange={(e) => setNewBanner((prev) => ({ ...prev, textColor: e.target.value }))}
                    className="h-10 w-14 rounded border border-gray-300"
                  />
                  <input
                    type="text"
                    placeholder="rgba(...) hoặc #hex"
                    value={newBanner.textColor}
                    onChange={(e) => setNewBanner((prev) => ({ ...prev, textColor: e.target.value }))}
                    className="flex-1 rounded-xl border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Vị trí chữ</label>
                <select
                  value={newBanner.textPosition}
                  onChange={(e) =>
                    setNewBanner((prev) => ({
                      ...prev,
                      textPosition: e.target.value as HeroBanner["textPosition"],
                    }))
                  }
                  className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm"
                >
                  {TEXT_POS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow hover:bg-blue-700 disabled:opacity-60"
              disabled={loadingMap["create-banner"]}
            >
              {loadingMap["create-banner"] ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Thêm banner
            </button>
          </form>
        </section>
      )}

      {heroGalleryOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-4xl rounded-2xl bg-white p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Thư viện Hero Banner</h3>
              <button
                type="button"
                className="text-sm text-gray-500 hover:text-gray-700"
                onClick={closeHeroGallery}
              >
                Đóng
              </button>
            </div>
            {heroGalleryError && (
              <div className="rounded border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-600">
                {heroGalleryError}
              </div>
            )}
            <div className="max-h-[60vh] overflow-y-auto rounded border p-3">
              {heroGalleryItems.length > 0 ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                  {heroGalleryItems.map((item) => (
                    <button
                      key={item.assetId}
                      type="button"
                      className="rounded border bg-white p-2 text-left transition hover:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      onClick={() => handleSelectHeroGallery(item)}
                    >
                      <div className="relative w-full overflow-hidden rounded bg-gray-50 aspect-video">
                        <Image
                          src={item.secureUrl}
                          alt={item.publicId}
                          fill
                          sizes="300px"
                          className="object-cover"
                        />
                      </div>
                      <div className="mt-2 text-[11px] text-gray-500 line-clamp-2 break-all">
                        {item.publicId}
                      </div>
                      <div className="text-[10px] text-gray-400">
                        {(item.bytes / 1024).toFixed(0)} KB
                      </div>
                    </button>
                  ))}
                </div>
              ) : heroGalleryLoading ? (
                <div className="py-6 text-center text-sm text-gray-500">Đang tải...</div>
              ) : (
                <div className="py-6 text-center text-sm text-gray-500">
                  Chưa có ảnh trong thư viện.
                </div>
              )}
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-xs text-gray-500">
                Folder Cloudinary:
                <code className="ml-1 rounded bg-gray-100 px-1 py-0.5 text-[11px]">
                  hero_banner
                </code>
              </span>
              <div className="flex items-center gap-2">
                {heroGalleryCursor && (
                  <button
                    type="button"
                    onClick={() => loadHeroGallery(heroGalleryCursor, true)}
                    disabled={heroGalleryLoading}
                    className="rounded border px-3 py-1.5 disabled:opacity-50"
                  >
                    {heroGalleryLoading ? "Đang tải..." : "Tải thêm"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
