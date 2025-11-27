"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import {
  Loader2,
  Save,
  Plus,
  Trash2,
  ImageIcon,
  Megaphone,
  Percent,
  FileText,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { makeHeaders } from "../_lib/fetcher";

type OrderEmailResp = { data: { email: string } };
type TaxResp = { data: { rate: number } };
type HeroBanner = {
  id: string;
  imageUrl: string;
  title: string | null;
  content: string | null;
  ctaLabel: string | null;
  ctaHref: string | null;
  sortOrder: number;
  isActive: boolean;
};
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
type PolicySection = {
  id: string;
  slug: string;
  title: string;
  description?: string | null;
  allowedText?: string | null;
  deniedText?: string | null;
  content?: string | null;
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

export default function SystemSettingsPage() {
  const [pageLoading, setPageLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [emailSaving, setEmailSaving] = useState(false);
  const [taxRate, setTaxRate] = useState(0.1);
  const [taxSaving, setTaxSaving] = useState(false);
  const [heroBanners, setHeroBanners] = useState<HeroBanner[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [policySections, setPolicySections] = useState<PolicySection[]>([]);
  const [newBanner, setNewBanner] = useState({
    imageUrl: "",
    title: "",
    content: "",
    ctaLabel: "",
    ctaHref: "",
    sortOrder: 0,
  });
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
  const [heroGalleryOpen, setHeroGalleryOpen] = useState(false);
  const [heroGalleryItems, setHeroGalleryItems] = useState<CloudAsset[]>([]);
  const [heroGalleryCursor, setHeroGalleryCursor] = useState<string | null>(null);
  const [heroGalleryLoading, setHeroGalleryLoading] = useState(false);
  const [heroGalleryError, setHeroGalleryError] = useState<string | null>(null);
  const [heroGalleryTarget, setHeroGalleryTarget] = useState<{ type: "existing" | "new"; id?: string }>({
    type: "new",
  });
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
        const [emailData, taxData, bannerData, announcementData, policyData] = await Promise.all([
          fetchJSON<OrderEmailResp>("/api/admin/system-settings/order-email"),
          fetchJSON<TaxResp>("/api/admin/system-settings/tax"),
          fetchJSON<{ data: HeroBanner[] }>("/api/admin/hero-banners"),
          fetchJSON<{ data: Announcement[] }>("/api/admin/announcements"),
          fetchJSON<{ data: PolicySection[] }>("/api/admin/policies"),
        ]);
        if (ignore) return;
        setEmail(emailData.data.email);
        setTaxRate(taxData.data.rate ?? 0.1);
        setHeroBanners(bannerData.data);
        setAnnouncements(announcementData.data);
        setPolicySections(policyData.data);
      } catch (error) {
        console.error("Failed to load settings", error);
        toast.error("Không tải được dữ liệu hệ thống.");
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

  function openHeroGallery(target: { type: "existing" | "new"; id?: string }) {
    setHeroGalleryTarget(target);
    setHeroGalleryItems([]);
    setHeroGalleryCursor(null);
    setHeroGalleryOpen(true);
    void loadHeroGallery(null, false);
  }

  function openPopupGallery(target: { type: "existing" | "new"; id?: string }) {
    setPopupGalleryTarget(target);
    setPopupGalleryItems([]);
    setPopupGalleryCursor(null);
    setPopupGalleryOpen(true);
    void loadPopupGallery(null, false);
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

  function closeHeroGallery() {
    setHeroGalleryOpen(false);
    setHeroGalleryTarget({ type: "new" });
    setHeroGalleryError(null);
  }

  function closePopupGallery() {
    setPopupGalleryOpen(false);
    setPopupGalleryTarget({ type: "new" });
    setPopupGalleryError(null);
  }

  /* ===== Notification Email ===== */
  async function handleSaveEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) {
      toast.error("Email không được để trống.");
      return;
    }
    setEmailSaving(true);
    try {
      const res = await fetch("/api/admin/system-settings/order-email", {
        method: "PUT",
        headers: makeHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success("Đã cập nhật email nhận thông báo.");
    } catch (error) {
      console.error("Failed to update email", error);
      toast.error("Không thể cập nhật email.");
    } finally {
      setEmailSaving(false);
    }
  }

  /* ===== Tax Rate ===== */
  async function handleSaveTax(e: React.FormEvent) {
    e.preventDefault();
    if (taxRate < 0 || taxRate > 1) {
      toast.error("Thuế không hợp lệ.");
      return;
    }
    setTaxSaving(true);
    try {
      const res = await fetch("/api/admin/system-settings/tax", {
        method: "PUT",
        headers: makeHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ rate: taxRate * 100 }),
      });
      if (!res.ok) throw new Error(await res.text());
      const json: TaxResp = await res.json();
      setTaxRate(json.data.rate);
      toast.success("Đã cập nhật thuế hiển thị.");
    } catch (error) {
      console.error("Failed to update tax", error);
      toast.error("Không thể cập nhật thuế.");
    } finally {
      setTaxSaving(false);
    }
  }

  /* ===== Hero Banners ===== */
  const updateLocalBanner = (id: string, changes: Partial<HeroBanner>) => {
    setHeroBanners((prev) =>
      prev.map((banner) => (banner.id === id ? { ...banner, ...changes } : banner)),
    );
  };

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
    if (!confirm("Xóa banner này?")) return;
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
      });
      toast.success("Đã thêm banner mới.");
    } catch (error) {
      console.error("Failed to create banner", error);
      toast.error("Không thể thêm banner.");
    } finally {
      updateLoadingMap("create-banner", false);
    }
  }

  /* ===== Announcements ===== */
  const updateLocalAnnouncement = (id: string, changes: Partial<Announcement>) => {
    setAnnouncements((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...changes } : item)),
    );
  };

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
    if (!confirm("Xóa banner quảng cáo này?")) return;
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
      setAnnouncements((prev) => [json.data, ...prev]);
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

  /* ===== Policies ===== */
  const updateLocalPolicy = (slug: string, changes: Partial<PolicySection>) => {
    setPolicySections((prev) =>
      prev.map((section) => (section.slug === slug ? { ...section, ...changes } : section)),
    );
  };

  async function handleSavePolicy(slug: string) {
    const policy = policySections.find((p) => p.slug === slug);
    if (!policy) return;
    updateLoadingMap(`policy-${slug}`, true);
    try {
      const res = await fetch(`/api/admin/policies/${slug}`, {
        method: "PUT",
        headers: makeHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          description: policy.description,
          allowedText: policy.allowedText,
          deniedText: policy.deniedText,
          content: policy.content,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success(`Đã lưu ${policy.title}.`);
    } catch (error) {
      console.error("Failed to save policy", error);
      toast.error("Không thể cập nhật chính sách.");
    } finally {
      updateLoadingMap(`policy-${slug}`, false);
    }
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="space-y-6">
        <header>
          <h1 className="text-2xl font-bold text-gray-900">Quản lý hệ thống</h1>
          <p className="text-gray-600">
            Cấu hình banner, quảng cáo, thuế và nội dung chính sách hiển thị trên website.
          </p>
        </header>

        {pageLoading ? (
          <div className="flex items-center gap-2 text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin" /> Đang tải dữ liệu...
          </div>
        ) : (
          <>
            {/* Notification + Tax */}
            <section className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-2xl border bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-gray-900 mb-1">
                  Email nhận thông báo đơn hàng
                </h2>
                <p className="text-sm text-gray-500 mb-4">
                  Địa chỉ email này sẽ nhận được thông báo mỗi khi khách đặt hàng mới.
                </p>
                <form onSubmit={handleSaveEmail} className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Email</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                      placeholder="orders@ahso.vn"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={emailSaving}
                    className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow hover:bg-blue-700 disabled:opacity-60"
                  >
                    {emailSaving ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Đang lưu...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" /> Lưu thay đổi
                      </>
                    )}
                  </button>
                </form>
              </div>

              <div className="rounded-2xl border bg-white p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-1">
                  <Percent className="h-5 w-5 text-blue-500" />
                  <h2 className="text-lg font-semibold text-gray-900">Thuế (VAT)</h2>
                </div>
                <p className="text-sm text-gray-500 mb-4">
                  Tỷ lệ thuế hiển thị ở trang thanh toán (áp dụng toàn bộ đơn hàng).
                </p>
                <form onSubmit={handleSaveTax} className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      Thuế (%)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={Math.round(taxRate * 1000) / 10}
                      onChange={(e) => setTaxRate(Number(e.target.value) / 100)}
                      className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={taxSaving}
                    className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow hover:bg-blue-700 disabled:opacity-60"
                  >
                    {taxSaving ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Đang lưu...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" /> Lưu thuế
                      </>
                    )}
                  </button>
                </form>
              </div>
            </section>

            {/* Hero Banners */}
            <section className="rounded-2xl border bg-white p-6 shadow-sm space-y-6">
              <div className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5 text-blue-500" />
                <h2 className="text-lg font-semibold text-gray-900">
                  Banner Hero trang chủ
                </h2>
              </div>
              <p className="text-sm text-gray-500">
                Quản lý ảnh và nội dung hiển thị ở khu vực Hero. Nếu để trống tiêu đề hoặc
                nội dung, hệ thống sẽ chỉ hiển thị hình ảnh.
              </p>

              <div className="space-y-4 max-h-[540px] overflow-y-auto pr-2">
                {heroBanners.map((banner) => {
                  const uploadKey = `hero-upload-${banner.id}`;
                  const heroUploading = loadingMap[uploadKey];
                  return (
                    <div
                      key={banner.id}
                      className="rounded-2xl border border-gray-200 p-4 space-y-3"
                    >
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <label className="text-xs font-medium text-gray-600">
                            Ảnh banner
                          </label>
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
                            onChange={(e) =>
                              updateLocalBanner(banner.id, { imageUrl: e.target.value })
                            }
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
                                <Loader2 className="h-3 w-3 animate-spin" />
                                Đang tải...
                              </span>
                            )}
                          </div>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-600">Tiêu đề</label>
                          <input
                            value={banner.title ?? ""}
                            onChange={(e) =>
                              updateLocalBanner(banner.id, { title: e.target.value })
                            }
                            className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm"
                          />
                        </div>
                      </div>
                      <textarea
                        placeholder="Nội dung (tùy chọn)"
                        value={banner.content ?? ""}
                        onChange={(e) =>
                          updateLocalBanner(banner.id, { content: e.target.value })
                        }
                        className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm"
                      />
                      <div className="grid gap-4 md:grid-cols-3">
                        <input
                          placeholder="CTA label"
                          value={banner.ctaLabel ?? ""}
                          onChange={(e) =>
                            updateLocalBanner(banner.id, { ctaLabel: e.target.value })
                          }
                          className="rounded-xl border border-gray-300 px-3 py-2 text-sm"
                        />
                        <input
                          placeholder="CTA link"
                          value={banner.ctaHref ?? ""}
                          onChange={(e) =>
                            updateLocalBanner(banner.id, { ctaHref: e.target.value })
                          }
                          className="rounded-xl border border-gray-300 px-3 py-2 text-sm"
                        />
                        <input
                          type="number"
                          min={0}
                          placeholder="Thứ tự"
                          value={banner.sortOrder}
                          onChange={(e) =>
                            updateLocalBanner(banner.id, { sortOrder: Number(e.target.value) })
                          }
                          className="rounded-xl border border-gray-300 px-3 py-2 text-sm"
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 text-sm text-gray-600">
                          <input
                            type="checkbox"
                            checked={banner.isActive}
                            onChange={(e) =>
                              updateLocalBanner(banner.id, { isActive: e.target.checked })
                            }
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
                      onChange={(e) =>
                        setNewBanner((prev) => ({ ...prev, imageUrl: e.target.value }))
                      }
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
                      onChange={(e) =>
                        setNewBanner((prev) => ({ ...prev, title: e.target.value }))
                      }
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
                    onChange={(e) =>
                      setNewBanner((prev) => ({ ...prev, ctaLabel: e.target.value }))
                    }
                    className="rounded-xl border border-gray-300 px-3 py-2 text-sm"
                  />
                  <input
                    placeholder="CTA link"
                    value={newBanner.ctaHref}
                    onChange={(e) =>
                      setNewBanner((prev) => ({ ...prev, ctaHref: e.target.value }))
                    }
                    className="rounded-xl border border-gray-300 px-3 py-2 text-sm"
                  />
                  <input
                    type="number"
                    min={0}
                    placeholder="Thứ tự"
                    value={newBanner.sortOrder}
                    onChange={(e) =>
                      setNewBanner((prev) => ({ ...prev, sortOrder: Number(e.target.value) }))
                    }
                    className="rounded-xl border border-gray-300 px-3 py-2 text-sm"
                  />
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

            {/* Announcements */}
            <section className="rounded-2xl border bg-white p-6 shadow-sm space-y-6">
              <div className="flex items-center gap-2">
                <Megaphone className="h-5 w-5 text-blue-500" />
                <h2 className="text-lg font-semibold text-gray-900">
                  Banner/Popup quảng cáo
                </h2>
              </div>
              <p className="text-sm text-gray-500">
                Hiển thị cho người dùng mỗi lần mở phiên hoặc đăng nhập mới. Bạn có thể
                thêm nhiều banner và tùy chỉnh nội dung hiển thị.
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
                            onChange={(e) =>
                              updateLocalAnnouncement(ann.id, { imageUrl: e.target.value })
                            }
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
                            onChange={(e) =>
                              updateLocalAnnouncement(ann.id, { content: e.target.value })
                            }
                            className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm min-h-[100px]"
                          />
                        </div>
                      </div>
                      <div className="grid gap-4 md:grid-cols-3">
                        <input
                          placeholder="CTA label"
                          value={ann.ctaLabel ?? ""}
                          onChange={(e) =>
                            updateLocalAnnouncement(ann.id, { ctaLabel: e.target.value })
                          }
                          className="rounded-xl border border-gray-300 px-3 py-2 text-sm"
                        />
                        <input
                          placeholder="CTA link"
                          value={ann.ctaHref ?? ""}
                          onChange={(e) =>
                            updateLocalAnnouncement(ann.id, { ctaHref: e.target.value })
                          }
                          className="rounded-xl border border-gray-300 px-3 py-2 text-sm"
                        />
                        <div className="flex flex-col gap-2 text-sm text-gray-600">
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={ann.isActive}
                              onChange={(e) =>
                                updateLocalAnnouncement(ann.id, { isActive: e.target.checked })
                              }
                            />
                            Hiển thị
                          </label>
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={ann.showOnVisit}
                              onChange={(e) =>
                                updateLocalAnnouncement(ann.id, { showOnVisit: e.target.checked })
                              }
                            />
                            Hiện khi mở trang
                          </label>
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={ann.showOnLogin}
                              onChange={(e) =>
                                updateLocalAnnouncement(ann.id, { showOnLogin: e.target.checked })
                              }
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
                      onChange={(e) =>
                        setNewAnnouncement((prev) => ({ ...prev, imageUrl: e.target.value }))
                      }
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
                      onChange={(e) =>
                        setNewAnnouncement((prev) => ({ ...prev, title: e.target.value }))
                      }
                      className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm"
                    />
                    <textarea
                      placeholder="Nội dung"
                      value={newAnnouncement.content}
                      onChange={(e) =>
                        setNewAnnouncement((prev) => ({ ...prev, content: e.target.value }))
                      }
                      className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm min-h-[100px]"
                    />
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <input
                    placeholder="CTA label"
                    value={newAnnouncement.ctaLabel}
                    onChange={(e) =>
                      setNewAnnouncement((prev) => ({ ...prev, ctaLabel: e.target.value }))
                    }
                    className="rounded-xl border border-gray-300 px-3 py-2 text-sm"
                  />
                  <input
                    placeholder="CTA link"
                    value={newAnnouncement.ctaHref}
                    onChange={(e) =>
                      setNewAnnouncement((prev) => ({ ...prev, ctaHref: e.target.value }))
                    }
                    className="rounded-xl border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
                <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={newAnnouncement.showOnVisit}
                      onChange={(e) =>
                        setNewAnnouncement((prev) => ({ ...prev, showOnVisit: e.target.checked }))
                      }
                    />
                    Hiện khi mở trang
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={newAnnouncement.showOnLogin}
                      onChange={(e) =>
                        setNewAnnouncement((prev) => ({ ...prev, showOnLogin: e.target.checked }))
                      }
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

            {/* Policies */}
            <section className="rounded-2xl border bg-white p-6 shadow-sm space-y-6">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-500" />
                <h2 className="text-lg font-semibold text-gray-900">
                  Nội dung chính sách
                </h2>
              </div>
              <p className="text-sm text-gray-500">
                Mỗi mục sẽ hiển thị trên trang Chính sách. Bạn có thể thêm nhiều dòng bằng
                cách xuống hàng.
              </p>
              <div className="space-y-6">
                {policySections.map((section) => (
                  <div key={section.slug} className="rounded-2xl border border-gray-200 p-4 space-y-3">
                    <div className="font-semibold text-gray-900">{section.title}</div>
                    <textarea
                      placeholder="Mô tả ngắn"
                      value={section.description ?? ""}
                      onChange={(e) =>
                        updateLocalPolicy(section.slug, { description: e.target.value })
                      }
                      className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm"
                    />
                    <div className="grid gap-4 lg:grid-cols-2">
                      <textarea
                        placeholder="Điều kiện được áp dụng (mỗi dòng một điều kiện)"
                        value={section.allowedText ?? ""}
                        onChange={(e) =>
                          updateLocalPolicy(section.slug, { allowedText: e.target.value })
                        }
                        className="rounded-xl border border-gray-300 px-3 py-2 text-sm min-h-[140px]"
                      />
                      <textarea
                        placeholder="Trường hợp không áp dụng"
                        value={section.deniedText ?? ""}
                        onChange={(e) =>
                          updateLocalPolicy(section.slug, { deniedText: e.target.value })
                        }
                        className="rounded-xl border border-gray-300 px-3 py-2 text-sm min-h-[140px]"
                      />
                    </div>
                    <textarea
                      placeholder="Nội dung chung / hướng dẫn thêm"
                      value={section.content ?? ""}
                      onChange={(e) =>
                        updateLocalPolicy(section.slug, { content: e.target.value })
                      }
                      className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm min-h-[120px]"
                    />
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => handleSavePolicy(section.slug)}
                        className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                        disabled={loadingMap[`policy-${section.slug}`]}
                      >
                        {loadingMap[`policy-${section.slug}`] ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4" />
                        )}
                        Lưu {section.title}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
      </div>
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
                <button
                  type="button"
                  onClick={closeHeroGallery}
                  className="rounded border px-3 py-1.5"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {popupGalleryOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-4xl rounded-2xl bg-white p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Thư viện popup/banner</h3>
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
                  popup_banner
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
                <button
                  type="button"
                  onClick={closePopupGallery}
                  className="rounded border px-3 py-1.5"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
