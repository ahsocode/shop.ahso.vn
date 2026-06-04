"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import HtmlContentEditor from "@/components/admin/HtmlContentEditor";
import { getJSON, makeHeaders, patchJSON, postJSON } from "@/app/admin/_lib/fetcher";
import { confirmToast } from "@/lib/confirm-toast";
import { ContentManagementNav } from "@/components/admin/content/ContentManagementNav";
import {
  configByKind,
  type ArticleDetail,
  type CategoryRow,
  type ContentKind,
  type ContentStatus,
} from "@/components/admin/content/content-article-config";

type FormState = {
  title: string;
  summary: string;
  coverImage: string;
  bodyHtml: string;
  industry: string;
  usecase: string;
  status: ContentStatus;
  categoryId: string;
};

const EMPTY_FORM: FormState = {
  title: "",
  summary: "",
  coverImage: "",
  bodyHtml: "",
  industry: "",
  usecase: "",
  status: "DRAFT",
  categoryId: "",
};

type UploadResponse = {
  success: boolean;
  url?: string;
  error?: string;
};

export function ContentArticleEditor({ id, kind }: { id?: string; kind: ContentKind }) {
  const router = useRouter();
  const config = configByKind[kind];
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [loading, setLoading] = useState(Boolean(id));
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const isEditMode = Boolean(id);

  useEffect(() => {
    let ignore = false;

    async function loadInitialData() {
      setLoading(true);
      try {
        const [categoryRes, detailRes] = await Promise.all([
          getJSON<{ data: CategoryRow[] }>(config.categoriesApi),
          id ? getJSON<{ data: ArticleDetail }>(`${config.apiBase}/${id}`) : Promise.resolve(null),
        ]);

        if (ignore) return;
        setCategories(categoryRes.data);

        if (detailRes) {
          const data = detailRes.data;
          setForm({
            title: data.title,
            summary: data.summary ?? "",
            coverImage: data.coverImage ?? "",
            bodyHtml: data.bodyHtml ?? "",
            industry: data.industry ?? "",
            usecase: data.usecase ?? "",
            status: data.status,
            categoryId: data.categoryId,
          });
        }
      } catch {
        if (!ignore) toast.error("Không thể tải dữ liệu bài viết.");
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    void loadInitialData();
    return () => {
      ignore = true;
    };
  }, [config.apiBase, config.categoriesApi, id]);

  const updateForm = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleCoverUpload = async (file: File | null | undefined) => {
    if (!file) return;

    setUploading(true);
    const toastId = toast.loading("Đang tải ảnh bìa lên Cloudinary...");
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(config.uploadCoverApi, {
        method: "POST",
        headers: makeHeaders(),
        body: formData,
      });
      const data = (await res.json()) as UploadResponse;
      if (!res.ok || !data.url) throw new Error(data.error || "Upload failed");

      updateForm("coverImage", data.url);
      toast.success("Đã tải ảnh bìa.", { id: toastId });
    } catch {
      toast.error("Không thể tải ảnh bìa.", { id: toastId });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSave = async () => {
    const title = form.title.trim();
    const categoryId = form.categoryId.trim();
    const bodyHtml = form.bodyHtml.trim();

    if (!title || !categoryId || !bodyHtml) {
      toast.warning("Vui lòng nhập tên, danh mục và nội dung bài viết.");
      return;
    }

    const accepted = await confirmToast(isEditMode ? "Lưu thay đổi bài viết?" : "Tạo bài viết mới?", {
      description: isEditMode
        ? `Các thay đổi của "${title}" sẽ được cập nhật.`
        : `Bài viết "${title}" sẽ được tạo mới.`,
      confirmText: isEditMode ? "Lưu thay đổi" : "Tạo bài viết",
      cancelText: "Hủy",
      variant: "modal",
    });

    if (!accepted) return;

    setSaving(true);
    const toastId = toast.loading(isEditMode ? "Đang cập nhật bài viết..." : "Đang tạo bài viết...");
    try {
      const payload = {
        title,
        summary: form.summary.trim(),
        coverImage: form.coverImage.trim(),
        bodyHtml: form.bodyHtml,
        status: form.status,
        categoryId,
        ...(kind === "solution" ? { industry: form.industry.trim(), usecase: form.usecase.trim() } : {}),
      };

      if (id) {
        await patchJSON(`${config.apiBase}/${id}`, payload);
        toast.success("Đã cập nhật bài viết.", { id: toastId });
      } else {
        await postJSON(config.apiBase, payload);
        toast.success("Đã tạo bài viết.", { id: toastId });
      }

      router.push(config.listHref);
      router.refresh();
    } catch {
      toast.error("Không thể lưu bài viết.", { id: toastId });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-5">
        <ContentManagementNav />
        <div className="rounded-md border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          Đang tải dữ liệu bài viết...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <ContentManagementNav />

      <section className="rounded-md border border-slate-200 bg-white">
        <div className="flex flex-col gap-4 border-b border-slate-200 p-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <Link className="text-sm font-medium text-blue-700 hover:text-blue-800" href={config.listHref}>
              Quay lại danh sách
            </Link>
            <h1 className="mt-3 text-xl font-semibold text-slate-950">
              {isEditMode ? config.editTitle : config.createTitle}
            </h1>
            <p className="mt-1 text-sm text-slate-600">{config.description}</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => router.push(config.listHref)} type="button" variant="outline">
              Hủy
            </Button>
            <Button disabled={saving} onClick={() => void handleSave()} type="button">
              {saving ? "Đang lưu..." : "Lưu bài viết"}
            </Button>
          </div>
        </div>

        <div className="grid gap-6 p-5 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-800" htmlFor="article-title">
                Tên bài viết
              </label>
              <Input
                id="article-title"
                onChange={(event) => updateForm("title", event.target.value)}
                placeholder="Nhập tên bài viết"
                value={form.title}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-800" htmlFor="article-summary">
                Mô tả ngắn
              </label>
              <Textarea
                id="article-summary"
                onChange={(event) => updateForm("summary", event.target.value)}
                placeholder="Tóm tắt nội dung để người đọc dễ nắm ý chính"
                value={form.summary}
              />
            </div>

            {kind === "solution" ? (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-800" htmlFor="article-industry">
                    Ngành áp dụng
                  </label>
                  <Input
                    id="article-industry"
                    onChange={(event) => updateForm("industry", event.target.value)}
                    placeholder="Ví dụ: sản xuất, kho vận"
                    value={form.industry}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-800" htmlFor="article-usecase">
                    Use case
                  </label>
                  <Input
                    id="article-usecase"
                    onChange={(event) => updateForm("usecase", event.target.value)}
                    placeholder="Ví dụ: tối ưu vận hành"
                    value={form.usecase}
                  />
                </div>
              </div>
            ) : null}

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-800">Nội dung bài viết</label>
              <HtmlContentEditor
                ariaLabel="Nội dung bài viết"
                emptyPreviewText="Chưa có nội dung để xem trước."
                headers={makeHeaders()}
                onChange={(value) => updateForm("bodyHtml", value)}
                value={form.bodyHtml}
              />
            </div>
          </div>

          <aside className="space-y-5">
            <div className="rounded-md border border-slate-200 p-4">
              <label className="text-sm font-medium text-slate-800" htmlFor="article-category">
                {config.categoryLabel}
              </label>
              <select
                className="mt-2 h-9 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-slate-800 shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-600"
                id="article-category"
                onChange={(event) => updateForm("categoryId", event.target.value)}
                value={form.categoryId}
              >
                <option value="">Chọn danh mục</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="rounded-md border border-slate-200 p-4">
              <label className="text-sm font-medium text-slate-800" htmlFor="article-status">
                Trạng thái
              </label>
              <select
                className="mt-2 h-9 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-slate-800 shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-600"
                id="article-status"
                onChange={(event) => updateForm("status", event.target.value as ContentStatus)}
                value={form.status}
              >
                <option value="DRAFT">Bản nháp</option>
                <option value="PUBLISHED">Đã xuất bản</option>
                <option value="ARCHIVED">Đã lưu trữ</option>
              </select>
            </div>

            <div className="rounded-md border border-slate-200 p-4">
              <div className="text-sm font-medium text-slate-800">Ảnh bìa</div>
              <div className="mt-3 overflow-hidden rounded-md border border-slate-200 bg-slate-50">
                {form.coverImage ? (
                  <img alt="Ảnh bìa bài viết" className="aspect-video w-full object-cover" src={form.coverImage} />
                ) : (
                  <div className="flex aspect-video items-center justify-center px-4 text-center text-sm text-slate-500">
                    Chưa có ảnh bìa
                  </div>
                )}
              </div>
              <input
                accept="image/*"
                className="hidden"
                onChange={(event) => void handleCoverUpload(event.target.files?.[0])}
                ref={fileInputRef}
                type="file"
              />
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                  type="button"
                  variant="outline"
                >
                  {uploading ? "Đang tải..." : "Tải ảnh bìa"}
                </Button>
                {form.coverImage ? (
                  <Button onClick={() => updateForm("coverImage", "")} type="button" variant="ghost">
                    Gỡ ảnh
                  </Button>
                ) : null}
              </div>
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}
