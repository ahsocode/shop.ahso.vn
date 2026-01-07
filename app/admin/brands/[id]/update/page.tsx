"use client";

import { use, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Upload, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { confirmToast } from "@/lib/confirm-toast";
import { ImageCropDialog } from "@/components/image/image-crop-dialog";
import { getJSON, makeHeaders, patchJSON } from "@/app/admin/_lib/fetcher";

type BrandDetail = {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  summary: string | null;
};

type BrandResponse = {
  data: BrandDetail;
};

type BrandLogoAsset = {
  assetId: string;
  publicId: string;
  secureUrl: string;
  width: number;
  height: number;
  bytes: number;
  createdAt: string;
};

type GalleryResponse = {
  success: boolean;
  items: BrandLogoAsset[];
  nextCursor: string | null;
  error?: string;
};

export default function BrandUpdatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    slug: "",
    summary: "",
    logoUrl: "",
  });

  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const logoFileRef = useRef<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoCropOpen, setLogoCropOpen] = useState(false);
  const [logoCropSource, setLogoCropSource] = useState<{
    url: string;
    fileName: string;
    revokeOnClose: boolean;
  } | null>(null);

  const [logoGalleryOpen, setLogoGalleryOpen] = useState(false);
  const [logoGalleryItems, setLogoGalleryItems] = useState<BrandLogoAsset[]>([]);
  const [logoGalleryCursor, setLogoGalleryCursor] = useState<string | null>(null);
  const [logoGalleryLoading, setLogoGalleryLoading] = useState(false);
  const [logoGalleryError, setLogoGalleryError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      setLoading(true);
      try {
        const res = await getJSON<BrandResponse>(`/api/admin/brands/${id}`);
        if (ignore) return;
        setForm({
          name: res.data.name ?? "",
          slug: res.data.slug ?? "",
          summary: res.data.summary ?? "",
          logoUrl: res.data.logoUrl ?? "",
        });
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Không thể tải thương hiệu";
        toast.error(message);
        router.push("/admin/brands");
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    load();
    return () => {
      ignore = true;
    };
  }, [id, router]);

  const revokePreview = (url: string | null) => {
    if (url && url.startsWith("blob:")) {
      URL.revokeObjectURL(url);
    }
  };

  const handleSelectLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (logoInputRef.current) {
      logoInputRef.current.value = "";
    }
    const objectUrl = URL.createObjectURL(file);
    setLogoCropSource((prev) => {
      if (prev?.revokeOnClose && prev.url) {
        URL.revokeObjectURL(prev.url);
      }
      return { url: objectUrl, fileName: file.name, revokeOnClose: true };
    });
    setLogoCropOpen(true);
  };

  const handleLogoCropped = (result: { file: File; previewUrl: string }) => {
    revokePreview(logoPreview);
    logoFileRef.current = result.file;
    setLogoPreview(result.previewUrl);
    setLogoCropSource({
      url: result.previewUrl,
      fileName: result.file.name,
      revokeOnClose: false,
    });
    setLogoCropOpen(false);
  };

  const handleLogoDialogOpenChange = (open: boolean) => {
    setLogoCropOpen(open);
    if (!open) {
      if (logoCropSource?.revokeOnClose && logoCropSource.url) {
        URL.revokeObjectURL(logoCropSource.url);
      }
      setLogoCropSource(null);
    }
  };

  const clearLogoSelection = () => {
    logoFileRef.current = null;
    revokePreview(logoPreview);
    setLogoPreview(null);
  };

  const loadLogoGallery = async (cursor?: string, append = false) => {
    setLogoGalleryLoading(true);
    setLogoGalleryError(null);
    try {
      const params = new URLSearchParams();
      if (cursor) params.set("cursor", cursor);
      params.set("limit", "24");
      const res = await fetch(
        `/api/admin/brands/gallery?${params.toString()}`,
        { headers: makeHeaders() },
      );
      const json = (await res.json()) as GalleryResponse;
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Không thể tải thư viện logo");
      }
      setLogoGalleryItems((prev) =>
        append ? [...prev, ...json.items] : json.items,
      );
      setLogoGalleryCursor(json.nextCursor ?? null);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Không thể tải thư viện logo";
      setLogoGalleryError(message);
    } finally {
      setLogoGalleryLoading(false);
    }
  };

  const openLogoGallery = () => {
    setLogoGalleryOpen(true);
    if (!logoGalleryItems.length) {
      void loadLogoGallery();
    }
  };

  const handleSelectGalleryLogo = (item: BrandLogoAsset) => {
    clearLogoSelection();
    setForm((prev) => ({ ...prev, logoUrl: item.secureUrl }));
    setLogoGalleryOpen(false);
  };

  const handleUpdate = async () => {
    const confirmed = await confirmToast("Bạn muốn cập nhật thương hiệu này?");
    if (!confirmed) return;

    const name = form.name.trim();
    if (!name) {
      toast.error("Vui lòng nhập tên thương hiệu");
      return;
    }

    setSaving(true);
    try {
      let nextLogoUrl = form.logoUrl.trim();

      if (logoFileRef.current) {
        const fd = new FormData();
        fd.append("file", logoFileRef.current);
        const uploadRes = await fetch(
          `/api/admin/brands/${id}/upload-logo`,
          {
            method: "POST",
            headers: makeHeaders(),
            body: fd,
          },
        );
        if (!uploadRes.ok) {
          const errText = await uploadRes.text();
          throw new Error(errText || "Upload logo thất bại");
        }
        const uploadJson = (await uploadRes.json()) as {
          success?: boolean;
          data?: { logoUrl?: string | null };
          error?: string;
        };
        if (uploadJson.data?.logoUrl) {
          nextLogoUrl = uploadJson.data.logoUrl;
        }
      }

      const slug = form.slug.trim();
      const summary = form.summary.trim();

      const payload: Record<string, unknown> = {
        name,
        summary,
      };
      if (slug) payload.slug = slug;
      if (nextLogoUrl) payload.logoUrl = nextLogoUrl;

      await patchJSON(`/api/admin/brands/${id}`, payload);
      toast.success("Đã cập nhật thương hiệu");
      router.push("/admin/brands");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Không thể cập nhật thương hiệu";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        Đang tải thương hiệu...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
            Thương hiệu
          </p>
          <h1 className="text-xl font-semibold">Cập nhật thương hiệu</h1>
        </div>
        <Link
          href="/admin/brands"
          className="rounded border px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
        >
          Quay lại danh sách
        </Link>
      </div>

      <div className="rounded-2xl border bg-white shadow-sm">
        <div className="grid gap-8 px-6 py-6 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-800">
                Tên thương hiệu <span className="text-red-500">*</span>
              </label>
              <input
                className="w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                placeholder="VD: AHSO"
                value={form.name}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, name: e.target.value }))
                }
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-800">
                  Slug (tùy chọn)
                </label>
                <input
                  className="w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  placeholder="auto tạo nếu bỏ trống"
                  value={form.slug}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, slug: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-800">
                  Logo URL (tuỳ chọn)
                </label>
                <input
                  className="w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  placeholder="Dán URL nếu đã host ở nơi khác"
                  value={form.logoUrl}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, logoUrl: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-800">
                Giới thiệu ngắn
              </label>
              <textarea
                className="w-full rounded-lg border px-3 py-2 text-sm min-h-[140px] focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                placeholder="Tóm tắt lĩnh vực, sản phẩm nổi bật..."
                value={form.summary}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, summary: e.target.value }))
                }
              />
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-800">
              Logo thương hiệu
            </label>
            <p className="text-xs text-gray-500">
              Bạn có thể upload logo mới hoặc chọn từ thư viện Cloudinary.
            </p>
            <div className="flex items-start gap-4">
              <div className="relative h-28 w-28 overflow-hidden rounded-xl border bg-gray-50">
                {logoPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={logoPreview}
                    alt="Logo preview"
                    className="h-full w-full object-contain"
                  />
                ) : form.logoUrl ? (
                  <Image
                    src={form.logoUrl}
                    alt="Logo preview"
                    fill
                    sizes="112px"
                    className="object-contain"
                  />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center text-xs text-gray-400">
                    <Upload className="h-6 w-6" />
                    <span>Chưa có logo</span>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => logoInputRef.current?.click()}
                  className="inline-flex items-center rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white shadow hover:bg-blue-700"
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Chọn ảnh
                </button>
                <button
                  type="button"
                  onClick={openLogoGallery}
                  className="inline-flex items-center rounded-lg border px-3 py-2 text-sm font-medium text-gray-700 transition"
                >
                  Chọn từ thư viện
                </button>
                <button
                  type="button"
                  disabled={!logoPreview}
                  onClick={() => {
                    if (!logoPreview) return;
                    setLogoCropSource({
                      url: logoPreview,
                      fileName: "logo.webp",
                      revokeOnClose: false,
                    });
                    setLogoCropOpen(true);
                  }}
                  className="inline-flex items-center rounded-lg border px-3 py-2 text-sm font-medium text-gray-700 transition disabled:opacity-50"
                >
                  <Pencil className="mr-2 h-4 w-4" />
                  Chỉnh sửa
                </button>
                <button
                  type="button"
                  disabled={!logoPreview}
                  onClick={clearLogoSelection}
                  className="inline-flex items-center rounded-lg border px-3 py-2 text-sm font-medium text-gray-700 transition disabled:opacity-50"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Xoá ảnh
                </button>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleSelectLogo}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t bg-gray-50 px-6 py-4">
          <div className="text-sm text-gray-500">
            Nếu chọn ảnh, ảnh sẽ được upload khi bạn bấm lưu.
          </div>
          <button
            onClick={handleUpdate}
            disabled={!form.name.trim() || saving}
            className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-700 disabled:opacity-60"
          >
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Lưu thay đổi
          </button>
        </div>
      </div>

      {logoGalleryOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-4xl space-y-4 p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Thư viện logo Cloudinary</h2>
              <button
                onClick={() => setLogoGalleryOpen(false)}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Đóng
              </button>
            </div>

            {logoGalleryError && (
              <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {logoGalleryError}
              </div>
            )}

            <div className="max-h-[60vh] overflow-y-auto rounded border p-3">
              {logoGalleryItems.length > 0 ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                  {logoGalleryItems.map((item) => (
                    <button
                      key={item.assetId}
                      type="button"
                      className="rounded border bg-white p-2 text-left transition hover:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                      disabled={logoGalleryLoading}
                      onClick={() => handleSelectGalleryLogo(item)}
                    >
                      <div className="relative w-full overflow-hidden rounded bg-gray-50 aspect-square">
                        <Image
                          src={item.secureUrl}
                          alt={item.publicId}
                          fill
                          className="object-contain"
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
              ) : logoGalleryLoading ? (
                <div className="py-6 text-center text-sm text-gray-500">
                  Đang tải thư viện...
                </div>
              ) : (
                <div className="py-6 text-center text-sm text-gray-500">
                  Chưa có logo nào trong thư viện.
                </div>
              )}
            </div>

            <div className="flex items-center justify-between text-sm">
              <div className="text-xs text-gray-500">
                Folder Cloudinary:{" "}
                <code className="font-mono">brands/logos</code>
              </div>
              <div className="flex items-center gap-2">
                {logoGalleryCursor && (
                  <button
                    type="button"
                    onClick={() => loadLogoGallery(logoGalleryCursor, true)}
                    disabled={logoGalleryLoading}
                    className="rounded border px-3 py-2 text-sm disabled:opacity-50"
                  >
                    {logoGalleryLoading ? "Đang tải..." : "Tải thêm"}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setLogoGalleryOpen(false)}
                  className="rounded border px-3 py-2 text-sm"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ImageCropDialog
        open={logoCropOpen && Boolean(logoCropSource?.url)}
        imageSrc={logoCropSource?.url ?? null}
        fileName={logoCropSource?.fileName}
        aspectRatio={1}
        onOpenChange={handleLogoDialogOpenChange}
        onComplete={handleLogoCropped}
      />
    </div>
  );
}
