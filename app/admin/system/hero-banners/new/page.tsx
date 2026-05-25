"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ArrowRight,
  ImageIcon,
  Loader2,
  Save,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { confirmToast } from "@/lib/confirm-toast";
import { makeHeaders } from "@/app/admin/_lib/fetcher";

type HeroBanner = {
  imageUrl: string;
  title: string;
  content: string;
  ctaLabel: string;
  ctaHref: string;
  sortOrder: number;
  overlayOn: boolean;
  overlayColor: string;
  textColor: string;
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

const resolveOverlayColor = (value?: string | null) => {
  const raw = value?.trim();
  if (!raw) return "rgba(15,23,42,0.18)";
  const rgba = raw.match(
    /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*([01]?(?:\.\d+)?))?\s*\)$/i,
  );
  if (rgba) {
    const [, r, g, b, alpha] = rgba;
    return `rgba(${r}, ${g}, ${b}, ${Math.min(Number(alpha ?? 0.35), 0.45)})`;
  }
  if (/hsla?\(/i.test(raw)) return raw;
  const normalizedHex = raw.startsWith("#") ? raw : `#${raw}`;
  if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(normalizedHex)) {
    let hex = normalizedHex.replace("#", "");
    if (hex.length == 3) {
      hex = hex.split("").map((ch) => ch + ch).join("");
    }
    const hasAlpha = hex.length === 8;
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    const a = hasAlpha ? Math.min(parseInt(hex.slice(6, 8), 16) / 255, 0.45) : 0.35;
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  }
  return "rgba(15,23,42,0.18)";
};

const resolveTextPosition = (value: HeroBanner["textPosition"]) => {
  switch (value) {
    case "TOP_RIGHT":
      return "items-start justify-end";
    case "MIDDLE_LEFT":
      return "items-center justify-start";
    case "MIDDLE_RIGHT":
      return "items-center justify-end";
    case "BOTTOM_LEFT":
      return "items-end justify-start";
    case "BOTTOM_RIGHT":
      return "items-end justify-end";
    case "TOP_LEFT":
    default:
      return "items-start justify-start";
  }
};

const resolveTextColor = (value?: string | null) => {
  if (!value) return "#ffffff";
  if (/rgba?\(/i.test(value) || /hsla?\(/i.test(value)) return value;
  if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(value)) return value;
  return "#ffffff";
};

const sanitizeOptional = (value?: string | null) => {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : null;
};

export default function NewHeroBannerPage() {
  const router = useRouter();
  const defaultBanner: HeroBanner = {
    imageUrl: "",
    title: "",
    content: "",
    ctaLabel: "",
    ctaHref: "",
    sortOrder: 0,
    overlayOn: false,
    overlayColor: "rgba(15,23,42,0.18)",
    textColor: "#ffffff",
    textPosition: "MIDDLE_LEFT",
  };
  const [banner, setBanner] = useState<HeroBanner>({
    ...defaultBanner,
  });
  const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});
  const [heroGalleryOpen, setHeroGalleryOpen] = useState(false);
  const [heroGalleryItems, setHeroGalleryItems] = useState<CloudAsset[]>([]);
  const [heroGalleryCursor, setHeroGalleryCursor] = useState<string | null>(null);
  const [heroGalleryLoading, setHeroGalleryLoading] = useState(false);
  const [heroGalleryError, setHeroGalleryError] = useState<string | null>(null);

  const updateLoadingMap = (key: string, value: boolean) =>
    setLoadingMap((prev) => ({ ...prev, [key]: value }));

  async function uploadHeroImageFile(file: File) {
    updateLoadingMap("hero-upload-new", true);
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
      setBanner((prev) => ({ ...prev, imageUrl: url }));
      toast.success("Đã tải ảnh banner.");
    } catch (error) {
      console.error("upload hero banner error", error);
      toast.error("Tải ảnh banner thất bại.");
    } finally {
      updateLoadingMap("hero-upload-new", false);
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

  function openHeroGallery() {
    setHeroGalleryItems([]);
    setHeroGalleryCursor(null);
    setHeroGalleryOpen(true);
    void loadHeroGallery(null, false);
  }

  function handleSelectHeroGallery(asset: CloudAsset) {
    setBanner((prev) => ({ ...prev, imageUrl: asset.secureUrl }));
    closeHeroGallery();
  }

  function closeHeroGallery() {
    setHeroGalleryOpen(false);
    setHeroGalleryError(null);
  }

  async function handleCreateBanner(e: React.FormEvent) {
    e.preventDefault();
    const confirmed = await confirmToast("Lưu banner mới?", { variant: "modal" });
    if (!confirmed) return;
    if (!banner.imageUrl.trim()) {
      toast.error("Vui lòng nhập URL ảnh banner.");
      return;
    }
    updateLoadingMap("create-banner", true);
    try {
      const payload = {
        imageUrl: banner.imageUrl.trim(),
        title: sanitizeOptional(banner.title),
        content: sanitizeOptional(banner.content),
        ctaLabel: sanitizeOptional(banner.ctaLabel),
        ctaHref: sanitizeOptional(banner.ctaHref),
        sortOrder: banner.sortOrder,
        isActive: true,
        overlayOn: banner.overlayOn,
        overlayColor: sanitizeOptional(banner.overlayColor),
        textColor: sanitizeOptional(banner.textColor),
        textPosition: banner.textPosition,
      };
      const res = await fetch("/api/admin/hero-banners", {
        method: "POST",
        headers: makeHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success("Đã thêm banner mới.");
      router.push("/admin/system/hero-banners");
    } catch (error) {
      console.error("Failed to create banner", error);
      toast.error("Không thể thêm banner.");
    } finally {
      updateLoadingMap("create-banner", false);
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tạo banner mới</h1>
          <p className="text-gray-600">Thiết lập nội dung banner hiển thị ở trang chủ.</p>
        </div>
        <Link
          href="/admin/system/hero-banners"
          className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
        >
          Quay lại danh sách
        </Link>
      </header>

      <section className="rounded-2xl border bg-white p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <ImageIcon className="h-5 w-5 text-blue-500" />
          <h2 className="text-lg font-semibold text-gray-900">Thông tin banner</h2>
        </div>

        <form onSubmit={handleCreateBanner} className="space-y-4">
          <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-600">Ảnh banner</label>
              <div className="relative w-full overflow-hidden rounded-xl border bg-gray-50 aspect-[16/6]">
                {banner.imageUrl ? (
                  <Image
                    src={banner.imageUrl}
                    alt="Hero preview"
                    fill
                    sizes="(min-width: 1024px) 520px, 100vw"
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs text-gray-400">
                    Chưa có ảnh
                  </div>
                )}
                {banner.overlayOn && (
                  <div
                    className="absolute inset-0"
                    style={{ background: resolveOverlayColor(banner.overlayColor) }}
                  />
                )}
                {(banner.title || banner.content) && (
                  <div className="relative z-10 h-full">
                    <div
                      className={`h-full w-full px-4 sm:px-6 lg:px-8 flex ${resolveTextPosition(
                        banner.textPosition,
                      )}`}
                    >
                      <div className="max-w-3xl">
                        {banner.title && (
                          <h1
                            className="text-xl md:text-2xl lg:text-3xl font-bold mb-4 leading-tight"
                            style={{ color: resolveTextColor(banner.textColor) }}
                          >
                            {banner.title}
                          </h1>
                        )}

                        {banner.content && (
                          <p
                            className="text-sm md:text-base lg:text-lg mb-5 text-blue-100"
                            style={{ color: resolveTextColor(banner.textColor) }}
                          >
                            {banner.content}
                          </p>
                        )}

                        {banner.ctaLabel && banner.ctaHref && (
                          <div className="flex flex-wrap gap-3">
                            <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-white text-blue-600 rounded text-[10px] font-semibold shadow">
                              {banner.ctaLabel}
                              <ArrowRight className="w-3 h-3" />
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-2 text-xs text-gray-600">
                <button
                  type="button"
                  onClick={openHeroGallery}
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
                      if (file) void uploadHeroImageFile(file);
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
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-600">Tiêu đề</label>
                <input
                  placeholder="Tiêu đề"
                  value={banner.title}
                  onChange={(e) => setBanner((prev) => ({ ...prev, title: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Nội dung</label>
                <textarea
                  placeholder="Nội dung"
                  value={banner.content}
                  onChange={(e) => setBanner((prev) => ({ ...prev, content: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm"
                  rows={4}
                />
              </div>
              <div className="grid gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600">CTA label</label>
                  <input
                    placeholder="CTA label"
                    value={banner.ctaLabel}
                    onChange={(e) => setBanner((prev) => ({ ...prev, ctaLabel: e.target.value }))}
                    className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">CTA link</label>
                  <input
                    placeholder="CTA link"
                    value={banner.ctaHref}
                    onChange={(e) => setBanner((prev) => ({ ...prev, ctaHref: e.target.value }))}
                    className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">Thứ tự</label>
                  <input
                    type="number"
                    min={0}
                    placeholder="0"
                    value={banner.sortOrder}
                    onChange={(e) => setBanner((prev) => ({ ...prev, sortOrder: Number(e.target.value) }))}
                    className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div className="grid gap-3">
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={banner.overlayOn}
                    onChange={(e) => setBanner((prev) => ({ ...prev, overlayOn: e.target.checked }))}
                  />
                  Phủ nền trên ảnh
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="text-xs font-medium text-gray-600">Màu nền phủ</label>
                    <div className="mt-1 flex items-center gap-2">
                      <input
                        type="color"
                        value={resolveColorValue(banner.overlayColor)}
                        onChange={(e) => setBanner((prev) => ({ ...prev, overlayColor: e.target.value }))}
                        className="h-10 w-14 rounded border border-gray-300"
                        disabled={!banner.overlayOn}
                      />
                      <input
                        type="text"
                        placeholder="rgba(...) hoặc #hex"
                        value={banner.overlayColor}
                        onChange={(e) => setBanner((prev) => ({ ...prev, overlayColor: e.target.value }))}
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
                        onChange={(e) => setBanner((prev) => ({ ...prev, textColor: e.target.value }))}
                        className="h-10 w-14 rounded border border-gray-300"
                      />
                      <input
                        type="text"
                        placeholder="rgba(...) hoặc #hex"
                        value={banner.textColor}
                        onChange={(e) => setBanner((prev) => ({ ...prev, textColor: e.target.value }))}
                        className="flex-1 rounded-xl border border-gray-300 px-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">Vị trí chữ</label>
                  <select
                    value={banner.textPosition}
                    onChange={(e) =>
                      setBanner((prev) => ({
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
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={async () => {
                const confirmed = await confirmToast("Reset toàn bộ nội dung?", { variant: "modal" });
                if (!confirmed) return;
                setBanner({ ...defaultBanner });
              }}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              Reset
            </button>
            <Link
              href="/admin/system/hero-banners"
              onClick={async (event) => {
                event.preventDefault();
                const confirmed = await confirmToast("Hủy thay đổi và quay lại danh sách?", { variant: "modal" });
                if (!confirmed) return;
                router.push("/admin/system/hero-banners");
              }}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              Hủy
            </Link>
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow hover:bg-blue-700 disabled:opacity-60"
              disabled={loadingMap["create-banner"]}
            >
              {loadingMap["create-banner"] ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Lưu banner
            </button>
          </div>
        </form>
      </section>

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
                <div className="py-6 text-center text-sm text-gray-500">Chưa có ảnh.</div>
              )}
            </div>
            <div className="flex items-center justify-end">
              {heroGalleryCursor && (
                <button
                  type="button"
                  onClick={() => loadHeroGallery(heroGalleryCursor, true)}
                  disabled={heroGalleryLoading}
                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  {heroGalleryLoading ? "Đang tải..." : "Tải thêm"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
