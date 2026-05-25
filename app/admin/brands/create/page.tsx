"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Upload, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { confirmToast } from "@/lib/confirm-toast";
import { ImageCropDialog } from "@/components/image/image-crop-dialog";
import { makeHeaders, postJSON } from "@/app/admin/_lib/fetcher";

type CreateResponse = {
  data: {
    id: string;
  };
};

export default function BrandCreatePage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    slug: "",
    summary: "",
    logoUrl: "",
  });
  const [saving, setSaving] = useState(false);
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const logoFileRef = useRef<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoCropOpen, setLogoCropOpen] = useState(false);
  const [logoCropSource, setLogoCropSource] = useState<{
    url: string;
    fileName: string;
    revokeOnClose: boolean;
  } | null>(null);

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

  const handleCreate = async () => {
    const confirmed = await confirmToast("Bạn muốn tạo thương hiệu này?");
    if (!confirmed) return;
    const name = form.name.trim();
    if (!name) {
      toast.error("Vui lòng nhập tên thương hiệu");
      return;
    }

    setSaving(true);
    try {
      const slug = form.slug.trim();
      const summary = form.summary.trim();
      const logoUrl = form.logoUrl.trim();

      const payload = {
        name,
        ...(slug ? { slug } : {}),
        summary: summary || null,
        ...(logoFileRef.current ? {} : logoUrl ? { logoUrl } : {}),
      };

      const created = await postJSON<CreateResponse>(
        "/api/admin/brands",
        payload,
      );
      const brandId = created.data.id;

      if (logoFileRef.current) {
        const fd = new FormData();
        fd.append("file", logoFileRef.current);
        const uploadRes = await fetch(
          `/api/admin/brands/${brandId}/upload-logo`,
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
      }

      toast.success("Đã tạo thương hiệu");
      router.push("/admin/brands");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Không thể tạo thương hiệu";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
            Thương hiệu
          </p>
          <h1 className="text-xl font-semibold">Tạo thương hiệu mới</h1>
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
              Logo tải lên
            </label>
            <p className="text-xs text-gray-500">
              Kích thước vuông, nền trong suốt càng tốt. Ảnh sẽ được chuyển
              sang WebP trước khi lưu.
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
            Ảnh tải lên sẽ được xử lý và lưu tại Cloudinary.
          </div>
          <button
            onClick={handleCreate}
            disabled={!form.name.trim() || saving}
            className="inline-flex items-center rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-green-700 disabled:opacity-60"
          >
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Lưu thương hiệu
          </button>
        </div>
      </div>

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
