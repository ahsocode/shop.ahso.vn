"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { Loader2, Plus, Laptop, ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { confirmToast } from "@/lib/confirm-toast";
import { makeHeaders } from "@/app/admin/_lib/fetcher";

type FeaturedSoftware = {
  id: string;
  softwareId: string;
  title: string | null;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  updatedAt: string;
  software: {
    id: string;
    title: string;
    slug: string;
    coverImage: string | null;
    status: string;
    categoryName: string | null;
  };
};

type SoftwareOption = {
  id: string;
  title: string;
  slug: string;
  coverImage: string | null;
  categoryName: string | null;
};

const fetchJSON = async <T,>(url: string): Promise<T> => {
  const res = await fetch(url, { headers: makeHeaders() });
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()) as T;
};

export default function FeaturedSoftwaresPage() {
  const [pageLoading, setPageLoading] = useState(true);
  const [featuredSoftwares, setFeaturedSoftwares] = useState<FeaturedSoftware[]>([]);
  const [availableSoftwares, setAvailableSoftwares] = useState<SoftwareOption[]>([]);
  const [softwareFilter, setSoftwareFilter] = useState("");
  const [softwareSlotSelection, setSoftwareSlotSelection] = useState<number | null>(null);
  const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});
  const [bulkLoading, setBulkLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      try {
        const [featuredData, softwareListData] = await Promise.all([
          fetchJSON<{ data: FeaturedSoftware[] }>("/api/admin/featured-softwares"),
          fetchJSON<{
            data: {
              id: string;
              title: string;
              slug: string;
              coverImage: string | null;
              softwarecategory?: { name?: string | null } | null;
            }[];
          }>("/api/admin/software?mode=options&pageSize=200"),
        ]);
        if (ignore) return;
        setFeaturedSoftwares(featuredData.data);
        setAvailableSoftwares(
          (softwareListData.data ?? []).map((software) => ({
            id: software.id,
            title: software.title,
            slug: software.slug,
            coverImage: software.coverImage ?? null,
            categoryName: software.softwarecategory?.name ?? null,
          })),
        );
      } catch (error) {
        console.error("Failed to load featured softwares", error);
        toast.error("Không tải được dữ liệu phần mềm nổi bật.");
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

  async function handleDeleteFeaturedSoftware(id: string) {
    const confirmed = await confirmToast("Xóa phần mềm nổi bật này?", {
      variant: "modal",
    });
    if (!confirmed) return;
    updateLoadingMap(`featured-software-${id}`, true);
    try {
      const res = await fetch(`/api/admin/featured-softwares/${id}`,
        {
          method: "DELETE",
          headers: makeHeaders(),
        },
      );
      if (!res.ok) throw new Error(await res.text());
      setFeaturedSoftwares((prev) => prev.filter((f) => f.id !== id));
      setSelectedIds((prev) => prev.filter((x) => x !== id));
      toast.success("Đã xóa phần mềm nổi bật");
    } catch (error) {
      console.error("Failed to delete featured software", error);
      toast.error("Không thể xóa phần mềm nổi bật");
    } finally {
      updateLoadingMap(`featured-software-${id}`, false);
    }
  }

  const featuredSoftwareIds = useMemo(
    () => new Set(featuredSoftwares.map((item) => item.softwareId)),
    [featuredSoftwares],
  );

  const sortedFeatured = useMemo(() => {
    const sorted = [...featuredSoftwares].sort((a, b) => {
      const orderA = a.sortOrder ?? 0;
      const orderB = b.sortOrder ?? 0;
      if (orderA !== orderB) return orderA - orderB;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
    return sorted;
  }, [featuredSoftwares]);

  const softwareSlots = useMemo(
    () => Array.from({ length: 10 }, (_, idx) => sortedFeatured[idx] ?? null),
    [sortedFeatured],
  );

  const allFeaturedIds = useMemo(
    () => sortedFeatured.map((item) => item.id),
    [sortedFeatured],
  );
  const allSelected =
    allFeaturedIds.length > 0 &&
    allFeaturedIds.every((id) => selectedIds.includes(id));

  const toggleSelectAll = (checked: boolean) => {
    setSelectedIds(checked ? allFeaturedIds : []);
  };

  const toggleSelectItem = (id: string, checked: boolean) => {
    setSelectedIds((prev) =>
      checked ? Array.from(new Set([...prev, id])) : prev.filter((x) => x !== id),
    );
  };

  async function handleBulkDelete(mode: "all" | "selected") {
    const total = sortedFeatured.length;
    if (!total) {
      toast.info("Không có phần mềm nổi bật để xóa.");
      return;
    }
    const message =
      mode === "all"
        ? "Xóa toàn bộ phần mềm nổi bật?"
        : `Xóa ${selectedIds.length} phần mềm nổi bật đã chọn?`;
    const confirmed = await confirmToast(message, { variant: "modal" });
    if (!confirmed) return;
    setBulkLoading(true);
    try {
      const res = await fetch("/api/admin/featured-softwares/bulk-delete", {
        method: "POST",
        headers: makeHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ mode, ids: selectedIds }),
      });
      if (!res.ok) throw new Error(await res.text());
      const json = (await res.json()) as { deletedIds?: string[] };
      const deletedIds = json.deletedIds ?? [];
      if (deletedIds.length) {
        setFeaturedSoftwares((prev) => prev.filter((f) => !deletedIds.includes(f.id)));
        setSelectedIds((prev) => prev.filter((id) => !deletedIds.includes(id)));
        toast.success(`Đã xóa ${deletedIds.length} phần mềm nổi bật`);
      } else {
        toast.info("Không có phần mềm nổi bật để xóa.");
      }
    } catch (error) {
      console.error("Failed to bulk delete featured softwares", error);
      toast.error("Không thể xóa phần mềm nổi bật");
    } finally {
      setBulkLoading(false);
    }
  }

  async function handleAssignFeaturedSoftware(softwareId: string, slotIndex: number) {
    updateLoadingMap(`software-slot-${slotIndex}`, true);
    try {
      const payload = {
        softwareId,
        title: null,
        description: null,
        sortOrder: slotIndex,
        isActive: true,
        startDate: null,
        endDate: null,
      };
      const res = await fetch("/api/admin/featured-softwares", {
        method: "POST",
        headers: makeHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      setFeaturedSoftwares((prev) => [...prev, json.data]);
      toast.success("Đã thêm phần mềm nổi bật");
      setSoftwareSlotSelection(null);
      setSoftwareFilter("");
    } catch (error) {
      console.error("Failed to assign featured software", error);
      toast.error("Không thể thêm phần mềm này.");
    } finally {
      updateLoadingMap(`software-slot-${slotIndex}`, false);
    }
  }

  const filteredSoftwares = useMemo(() => {
    const keyword = softwareFilter.trim().toLowerCase();
    const pool = keyword
      ? availableSoftwares.filter((software) => {
          const haystack = `${software.title} ${software.slug}`.toLowerCase();
          return haystack.includes(keyword);
        })
      : availableSoftwares;
    return pool.filter((software) => !featuredSoftwareIds.has(software.id));
  }, [availableSoftwares, softwareFilter, featuredSoftwareIds]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">Phần mềm nổi bật</h1>
        <p className="text-gray-600">Chọn các phần mềm hiển thị nổi bật trên trang chủ.</p>
      </header>

      {pageLoading ? (
        <div className="flex items-center gap-2 text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Đang tải dữ liệu...
        </div>
      ) : (
        <section className="rounded-2xl border bg-white p-6 shadow-sm space-y-6">
          <div className="flex items-center gap-2">
            <Laptop className="h-5 w-5 text-blue-500" />
            <h2 className="text-lg font-semibold text-gray-900">Danh sách nổi bật</h2>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-gray-500">
              Chọn các phần mềm để hiển thị nổi bật trên trang chủ hoặc các trang khác.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={(e) => toggleSelectAll(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                Chọn tất cả
              </label>
              <button
                type="button"
                onClick={() => handleBulkDelete("all")}
                disabled={bulkLoading || sortedFeatured.length === 0}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Xóa toàn bộ
              </button>
              <button
                type="button"
                onClick={() => handleBulkDelete("selected")}
                disabled={bulkLoading || selectedIds.length === 0}
                className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                Xóa đã chọn
              </button>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
            {softwareSlots.map((slotItem, index) => (
              <button
                key={index}
                type="button"
                onClick={() =>
                  slotItem
                    ? void handleDeleteFeaturedSoftware(slotItem.id)
                    : setSoftwareSlotSelection(index)
                }
                className={`rounded-2xl border-2 border-dashed px-4 py-3 text-left transition hover:border-blue-400 ${
                  slotItem ? "border-blue-200 bg-blue-50/40" : "border-gray-200 hover:bg-gray-50"
                }`}
              >
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>Ô {index + 1}</span>
                  <span className={slotItem ? "text-blue-600 font-medium" : ""}>
                    {slotItem ? "Đang dùng" : "Trống"}
                  </span>
                </div>
                {slotItem ? (
                  <div className="flex items-center gap-3 mt-3">
                    <div className="self-start">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(slotItem.id)}
                        onChange={(e) => toggleSelectItem(slotItem.id, e.target.checked)}
                        onClick={(e) => e.stopPropagation()}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        aria-label={`Chọn ${slotItem.software.title}`}
                      />
                    </div>
                    {slotItem.software.coverImage ? (
                      <div className="relative w-14 h-14 rounded-xl overflow-hidden border border-white shadow-sm">
                        <Image
                          src={slotItem.software.coverImage}
                          alt={slotItem.software.title}
                          fill
                          sizes="56px"
                          className="object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-14 h-14 rounded-xl bg-white flex items-center justify-center text-gray-400 border border-white shadow-sm">
                        <ImageIcon className="h-5 w-5" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm text-gray-900 truncate">
                        {slotItem.software.title}
                      </div>
                      <div className="text-xs text-gray-500 truncate">
                        Slug: {slotItem.software.slug}
                      </div>
                      {slotItem.software.categoryName && (
                        <div className="text-xs text-gray-500 truncate">
                          {slotItem.software.categoryName}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center gap-1 text-blue-600 py-6">
                    <Plus className="h-5 w-5" />
                    <span className="text-sm font-semibold">Thêm phần mềm</span>
                    <span className="text-xs text-gray-500 text-center">Click để chọn nhanh</span>
                  </div>
                )}
              </button>
            ))}
          </div>
          <div className="text-xs text-gray-500 text-right">
            Đã sử dụng {featuredSoftwares.length}/10 ô
          </div>

          {softwareSlotSelection !== null && (
            <div className="border-t pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="font-semibold text-gray-900 flex items-center gap-2">
                  <Plus className="h-4 w-4" /> Chọn phần mềm cho ô {softwareSlotSelection + 1}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSoftwareSlotSelection(null);
                    setSoftwareFilter("");
                  }}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Hủy
                </button>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-600">Tìm phần mềm</label>
                <input
                  type="text"
                  placeholder="Nhập tên hoặc slug..."
                  value={softwareFilter}
                  onChange={(e) => setSoftwareFilter(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div className="border rounded-xl max-h-72 overflow-y-auto divide-y">
                {filteredSoftwares.length === 0 ? (
                  <div className="p-3 text-sm text-gray-500">
                    Không còn phần mềm nào khả dụng để thêm.
                  </div>
                ) : (
                  filteredSoftwares.map((software) => (
                    <button
                      key={software.id}
                      type="button"
                      onClick={() => handleAssignFeaturedSoftware(software.id, softwareSlotSelection)}
                      disabled={loadingMap[`software-slot-${softwareSlotSelection}`]}
                      className="w-full flex items-center gap-3 p-2 hover:bg-gray-50 text-left transition disabled:opacity-60"
                    >
                      {software.coverImage ? (
                        <div className="relative w-12 h-12 rounded overflow-hidden shrink-0">
                          <Image
                            src={software.coverImage}
                            alt={software.title}
                            fill
                            sizes="48px"
                            className="object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded bg-gray-100 flex items-center justify-center text-gray-400">
                          <ImageIcon className="h-4 w-4" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm text-gray-900 truncate">
                          {software.title}
                        </div>
                        <div className="text-xs text-gray-500 truncate">
                          Slug: {software.slug}
                        </div>
                        {software.categoryName && (
                          <div className="text-xs text-gray-500 truncate">
                            {software.categoryName}
                          </div>
                        )}
                      </div>
                      <span className="text-xs font-semibold text-blue-600">
                        {loadingMap[`software-slot-${softwareSlotSelection}`] ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          "Chọn"
                        )}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
