"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import {
  Loader2,
  Save,
  Plus,
  Trash2,
  Megaphone,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { confirmToast } from "@/lib/confirm-toast";
import { makeHeaders } from "@/app/admin/_lib/fetcher";

type Announcement = {
  id: string;
  title: string | null;
  content: string | null;
  imageUrl: string | null;
  ctaLabel: string | null;
  ctaHref: string | null;
  isActive: boolean;
  showOnLogin: boolean;
  showOnVisit: boolean;
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

export default function AnnouncementsPage() {
  const [pageLoading, setPageLoading] = useState(true);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [newAnnouncement, setNewAnnouncement] = useState({
    title: "",
    content: "",
    imageUrl: "",
    ctaLabel: "",
    ctaHref: "",
    showOnLogin: true,
    showOnVisit: true,
  });
  const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});
  const [popupGalleryOpen, setPopupGalleryOpen] = useState(false);
  const [popupGalleryItems, setPopupGalleryItems] = useState<CloudAsset[]>([]);
  const [popupGalleryCursor, setPopupGalleryCursor] = useState<string | null>(null);
  const [popupGalleryLoading, setPopupGalleryLoading] = useState(false);
  const [popupGalleryError, setPopupGalleryError] = useState<string | null>(null);
  const [popupGalleryTarget, setPopupGalleryTarget] = useState<{ type: "existing" | "new"; id?: string }>({
    type: "new",
  });

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      try {
        const announcementData = await fetchJSON<{ data: Announcement[] }>("/api/admin/announcements");
        if (ignore) return;
        setAnnouncements(announcementData.data);
      } catch (error) {
        console.error("Failed to load announcements", error);
        toast.error("Không tải được dữ liệu banner quảng cáo.");
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

  const updateLocalAnnouncement = (id: string, changes: Partial<Announcement>) => {
    setAnnouncements((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...changes } : item)),
    );
  };

  async function uploadPopupImageFile(
    file: File,
    target: { type: "existing" | "new"; id?: string },
  ) {
    const key = target.id ? `popup-upload-${target.id}` : "popup-upload-new";
    updateLoadingMap(key, true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/announcements/upload-image", {
        method: "POST",
        headers: makeHeaders(),
        body: fd,
      });
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      const url = json.url ?? json.secureUrl;
      if (!url) throw new Error("NO_URL");
      if (target.type === "existing" && target.id) {
        setAnnouncements((prev) =>
          prev.map((item) => (item.id === target.id ? { ...item, imageUrl: url } : item)),
        );
      } else {
        setNewAnnouncement((prev) => ({ ...prev, imageUrl: url }));
      }
      toast.success("Đã tải ảnh quảng cáo.");
    } catch (error) {
      console.error("upload popup banner error", error);
      toast.error("Tải ảnh quảng cáo thất bại.");
    } finally {
      updateLoadingMap(key, false);
    }
  }

  async function loadPopupGallery(cursor?: string | null, append = false) {
    setPopupGalleryLoading(true);
    setPopupGalleryError(null);
    try {
      const qs = cursor ? `?cursor=${encodeURIComponent(cursor)}` : "";
      const res = await fetch(`/api/admin/announcements/gallery${qs}`, {
        headers: makeHeaders(),
      });
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      const data: CloudAsset[] = Array.isArray(json?.data) ? json.data : [];
      setPopupGalleryItems((prev) => (append ? [...prev, ...data] : data));
      setPopupGalleryCursor(json?.nextCursor ?? null);
    } catch (error) {
      console.error("Failed to load popup gallery", error);
      setPopupGalleryError("Không tải được thư viện quảng cáo.");
    } finally {
      setPopupGalleryLoading(false);
    }
  }

  function openPopupGallery(target: { type: "existing" | "new"; id?: string }) {
    setPopupGalleryTarget(target);
    setPopupGalleryItems([]);
    setPopupGalleryCursor(null);
    setPopupGalleryOpen(true);
    void loadPopupGallery(null, false);
  }

  function handleSelectPopupGallery(asset: CloudAsset) {
    const target = popupGalleryTarget;
    if (!target) return;
    if (target.type === "existing" && target.id) {
      setAnnouncements((prev) =>
        prev.map((item) => (item.id === target.id ? { ...item, imageUrl: asset.secureUrl } : item)),
      );
    } else {
      setNewAnnouncement((prev) => ({ ...prev, imageUrl: asset.secureUrl }));
    }
    closePopupGallery();
  }

  function closePopupGallery() {
    setPopupGalleryOpen(false);
    setPopupGalleryTarget({ type: "new" });
    setPopupGalleryError(null);
  }

  async function handleSaveAnnouncement(id: string) {
    const announcement = announcements.find((a) => a.id === id);
    if (!announcement) return;
    updateLoadingMap(`announcement-${id}`, true);
    try {
      const payload = {
        title: sanitizeOptional(announcement.title),
        content: sanitizeOptional(announcement.content),
        imageUrl: sanitizeOptional(announcement.imageUrl),
        ctaLabel: sanitizeOptional(announcement.ctaLabel),
        ctaHref: sanitizeOptional(announcement.ctaHref),
        isActive: announcement.isActive,
        showOnLogin: announcement.showOnLogin,
        showOnVisit: announcement.showOnVisit,
      };

      const res = await fetch(`/api/admin/announcements/${id}`, {
        method: "PATCH",
        headers: makeHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success("Đã lưu banner quảng cáo.");
    } catch (error) {
      console.error("Failed to update announcement", error);
      toast.error("Không thể cập nhật banner quảng cáo.");
    } finally {
      updateLoadingMap(`announcement-${id}`, false);
    }
  }

  async function handleDeleteAnnouncement(id: string) {
    const confirmed = await confirmToast("Xóa banner quảng cáo này?");
    if (!confirmed) return;
    updateLoadingMap(`announcement-${id}`, true);
    try {
      const res = await fetch(`/api/admin/announcements/${id}`, {
        method: "DELETE",
        headers: makeHeaders(),
      });
      if (!res.ok) throw new Error(await res.text());
      setAnnouncements((prev) => prev.filter((a) => a.id !== id));
      toast.success("Đã xóa banner quảng cáo.");
    } catch (error) {
      console.error("Failed to delete announcement", error);
      toast.error("Không thể xóa banner quảng cáo.");
    } finally {
      updateLoadingMap(`announcement-${id}`, false);
    }
  }

  async function handleCreateAnnouncement(e: React.FormEvent) {
    e.preventDefault();
    updateLoadingMap("create-announcement", true);
    try {
      const payload = {
        title: sanitizeOptional(newAnnouncement.title),
        content: sanitizeOptional(newAnnouncement.content),
        imageUrl: sanitizeOptional(newAnnouncement.imageUrl),
        ctaLabel: sanitizeOptional(newAnnouncement.ctaLabel),
        ctaHref: sanitizeOptional(newAnnouncement.ctaHref),
        isActive: true,
        showOnLogin: newAnnouncement.showOnLogin,
        showOnVisit: newAnnouncement.showOnVisit,
      };

      const res = await fetch("/api/admin/announcements", {
        method: "POST",
        headers: makeHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      setAnnouncements((prev) => [...prev, json.data]);
      setNewAnnouncement({
        title: "",
        content: "",
        imageUrl: "",
        ctaLabel: "",
        ctaHref: "",
        showOnLogin: true,
        showOnVisit: true,
      });
      toast.success("Đã thêm banner quảng cáo.");
    } catch (error) {
      console.error("Failed to create announcement", error);
      toast.error("Không thể thêm banner quảng cáo.");
    } finally {
      updateLoadingMap("create-announcement", false);
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">Banner quảng cáo</h1>
        <p className="text-gray-600">Quản lý banner/pop-up quảng cáo hiển thị trên website.</p>
      </header>

      {pageLoading ? (
        <div className="flex items-center gap-2 text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Đang tải dữ liệu...
        </div>
      ) : (
        <section className="rounded-2xl border bg-white p-6 shadow-sm space-y-6">
          <div className="flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-blue-500" />
            <h2 className="text-lg font-semibold text-gray-900">Banner/Popup quảng cáo</h2>
          </div>
          <p className="text-sm text-gray-500">
            Hiển thị cho người dùng mỗi lần mở phiên hoặc đăng nhập mới. Bạn có thể thêm nhiều banner
            và tùy chỉnh nội dung hiển thị.
          </p>

          <div className="space-y-4">
            {announcements.map((ann) => {
              const popupUploadKey = `popup-upload-${ann.id}`;
              const popupUploading = loadingMap[popupUploadKey];
              return (
                <div key={ann.id} className="rounded-2xl border border-gray-200 p-4 space-y-3">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-gray-600">Ảnh quảng cáo</label>
                      <div className="relative h-32 w-full overflow-hidden rounded-xl border bg-gray-50">
                        {ann.imageUrl ? (
                          <Image
                            src={ann.imageUrl}
                            alt={ann.title || "Popup banner"}
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
                        value={ann.imageUrl ?? ""}
                        onChange={(e) => updateLocalAnnouncement(ann.id, { imageUrl: e.target.value })}
                        className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm"
                      />
                      <div className="flex flex-wrap gap-2 text-xs text-gray-600">
                        <button
                          type="button"
                          onClick={() => openPopupGallery({ type: "existing", id: ann.id })}
                          className="rounded border px-3 py-1.5 hover:bg-gray-50"
                        >
                          Chọn từ thư viện
                        </button>
                        <label
                          htmlFor={`popup-upload-${ann.id}`}
                          className="inline-flex items-center gap-1 rounded border px-3 py-1.5 hover:bg-gray-50 cursor-pointer"
                        >
                          <Upload className="h-3.5 w-3.5" /> Tải ảnh
                          <input
                            id={`popup-upload-${ann.id}`}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) void uploadPopupImageFile(file, { type: "existing", id: ann.id });
                              if (e.target) e.target.value = "";
                            }}
                          />
                        </label>
                        {popupUploading && (
                          <span className="flex items-center gap-1 text-blue-600">
                            <Loader2 className="h-3 w-3 animate-spin" /> Đang tải...
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-gray-600">Tiêu đề</label>
                      <input
                        placeholder="Tiêu đề"
                        value={ann.title ?? ""}
                        onChange={(e) => updateLocalAnnouncement(ann.id, { title: e.target.value })}
                        className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm"
                      />
                      <textarea
                        placeholder="Nội dung"
                        value={ann.content ?? ""}
                        onChange={(e) => updateLocalAnnouncement(ann.id, { content: e.target.value })}
                        className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm min-h-[100px]"
                      />
                    </div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-3">
                    <input
                      placeholder="CTA label"
                      value={ann.ctaLabel ?? ""}
                      onChange={(e) => updateLocalAnnouncement(ann.id, { ctaLabel: e.target.value })}
                      className="rounded-xl border border-gray-300 px-3 py-2 text-sm"
                    />
                    <input
                      placeholder="CTA link"
                      value={ann.ctaHref ?? ""}
                      onChange={(e) => updateLocalAnnouncement(ann.id, { ctaHref: e.target.value })}
                      className="rounded-xl border border-gray-300 px-3 py-2 text-sm"
                    />
                    <div className="flex flex-col gap-2 text-sm text-gray-600">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={ann.isActive}
                          onChange={(e) => updateLocalAnnouncement(ann.id, { isActive: e.target.checked })}
                        />
                        Hiển thị
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={ann.showOnVisit}
                          onChange={(e) => updateLocalAnnouncement(ann.id, { showOnVisit: e.target.checked })}
                        />
                        Hiện khi mở trang
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={ann.showOnLogin}
                          onChange={(e) => updateLocalAnnouncement(ann.id, { showOnLogin: e.target.checked })}
                        />
                        Hiện khi đăng nhập
                      </label>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => handleDeleteAnnouncement(ann.id)}
                      className="inline-flex items-center gap-1 rounded-xl border border-red-200 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50"
                      disabled={loadingMap[`announcement-${ann.id}`]}
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Xóa
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSaveAnnouncement(ann.id)}
                      className="inline-flex items-center gap-1 rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                      disabled={loadingMap[`announcement-${ann.id}`]}
                    >
                      {loadingMap[`announcement-${ann.id}`] ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Save className="h-3.5 w-3.5" />
                      )}
                      Lưu
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <form onSubmit={handleCreateAnnouncement} className="border-t pt-4 space-y-3">
            <div className="font-semibold text-gray-900 flex items-center gap-2">
              <Plus className="h-4 w-4" /> Thêm banner quảng cáo
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-600">Ảnh quảng cáo</label>
                <div className="relative h-32 w-full overflow-hidden rounded-xl border bg-gray-50">
                  {newAnnouncement.imageUrl ? (
                    <Image
                      src={newAnnouncement.imageUrl}
                      alt="Popup preview"
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
                  value={newAnnouncement.imageUrl}
                  onChange={(e) => setNewAnnouncement((prev) => ({ ...prev, imageUrl: e.target.value }))}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm"
                />
                <div className="flex flex-wrap gap-2 text-xs text-gray-600">
                  <button
                    type="button"
                    onClick={() => openPopupGallery({ type: "new" })}
                    className="rounded border px-3 py-1.5 hover:bg-gray-50"
                  >
                    Chọn từ thư viện
                  </button>
                  <label
                    htmlFor="popup-upload-new"
                    className="inline-flex items-center gap-1 rounded border px-3 py-1.5 hover:bg-gray-50 cursor-pointer"
                  >
                    <Upload className="h-3.5 w-3.5" /> Tải ảnh
                    <input
                      id="popup-upload-new"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void uploadPopupImageFile(file, { type: "new" });
                        if (e.target) e.target.value = "";
                      }}
                    />
                  </label>
                  {loadingMap["popup-upload-new"] && (
                    <span className="flex items-center gap-1 text-blue-600">
                      <Loader2 className="h-3 w-3 animate-spin" /> Đang tải...
                    </span>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-600">Tiêu đề</label>
                <input
                  placeholder="Tiêu đề"
                  value={newAnnouncement.title}
                  onChange={(e) => setNewAnnouncement((prev) => ({ ...prev, title: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm"
                />
                <textarea
                  placeholder="Nội dung"
                  value={newAnnouncement.content}
                  onChange={(e) => setNewAnnouncement((prev) => ({ ...prev, content: e.target.value }))}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm min-h-[100px]"
                />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <input
                placeholder="CTA label"
                value={newAnnouncement.ctaLabel}
                onChange={(e) => setNewAnnouncement((prev) => ({ ...prev, ctaLabel: e.target.value }))}
                className="rounded-xl border border-gray-300 px-3 py-2 text-sm"
              />
              <input
                placeholder="CTA link"
                value={newAnnouncement.ctaHref}
                onChange={(e) => setNewAnnouncement((prev) => ({ ...prev, ctaHref: e.target.value }))}
                className="rounded-xl border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="flex flex-wrap gap-4 text-sm text-gray-600">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={newAnnouncement.showOnVisit}
                  onChange={(e) => setNewAnnouncement((prev) => ({ ...prev, showOnVisit: e.target.checked }))}
                />
                Hiện khi mở trang
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={newAnnouncement.showOnLogin}
                  onChange={(e) => setNewAnnouncement((prev) => ({ ...prev, showOnLogin: e.target.checked }))}
                />
                Hiện khi đăng nhập
              </label>
            </div>
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow hover:bg-blue-700 disabled:opacity-60"
              disabled={loadingMap["create-announcement"]}
            >
              {loadingMap["create-announcement"] ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Thêm banner
            </button>
          </form>
        </section>
      )}

      {popupGalleryOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-4xl rounded-2xl bg-white p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Thư viện Banner Quảng Cáo</h3>
              <button
                type="button"
                className="text-sm text-gray-500 hover:text-gray-700"
                onClick={closePopupGallery}
              >
                Đóng
              </button>
            </div>
            {popupGalleryError && (
              <div className="rounded border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-600">
                {popupGalleryError}
              </div>
            )}
            <div className="max-h-[60vh] overflow-y-auto rounded border p-3">
              {popupGalleryItems.length > 0 ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                  {popupGalleryItems.map((item) => (
                    <button
                      key={item.assetId}
                      type="button"
                      className="rounded border bg-white p-2 text-left transition hover:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      onClick={() => handleSelectPopupGallery(item)}
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
              ) : popupGalleryLoading ? (
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
                  announcements
                </code>
              </span>
              <div className="flex items-center gap-2">
                {popupGalleryCursor && (
                  <button
                    type="button"
                    onClick={() => loadPopupGallery(popupGalleryCursor, true)}
                    disabled={popupGalleryLoading}
                    className="rounded border px-3 py-1.5 disabled:opacity-50"
                  >
                    {popupGalleryLoading ? "Đang tải..." : "Tải thêm"}
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
