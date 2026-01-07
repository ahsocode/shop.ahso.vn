"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { Loader2, Plus, Layers, ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { confirmToast } from "@/lib/confirm-toast";
import { makeHeaders } from "@/app/admin/_lib/fetcher";

type FeaturedSolution = {
  id: string;
  solutionId: string;
  title: string | null;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  updatedAt: string;
  solution: {
    id: string;
    title: string;
    slug: string;
    coverImage: string | null;
    status: string;
    categoryName: string | null;
  };
};

type SolutionOption = {
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

export default function FeaturedSolutionsPage() {
  const [pageLoading, setPageLoading] = useState(true);
  const [featuredSolutions, setFeaturedSolutions] = useState<FeaturedSolution[]>([]);
  const [availableSolutions, setAvailableSolutions] = useState<SolutionOption[]>([]);
  const [solutionFilter, setSolutionFilter] = useState("");
  const [solutionSlotSelection, setSolutionSlotSelection] = useState<number | null>(null);
  const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      try {
        const [featuredData, solutionListData] = await Promise.all([
          fetchJSON<{ data: FeaturedSolution[] }>("/api/admin/featured-solutions"),
          fetchJSON<{
            data: {
              id: string;
              title: string;
              slug: string;
              coverImage: string | null;
              solutioncategory?: { name?: string | null } | null;
            }[];
          }>("/api/admin/solutions?mode=options&pageSize=200"),
        ]);
        if (ignore) return;
        setFeaturedSolutions(featuredData.data);
        setAvailableSolutions(
          (solutionListData.data ?? []).map((solution) => ({
            id: solution.id,
            title: solution.title,
            slug: solution.slug,
            coverImage: solution.coverImage ?? null,
            categoryName: solution.solutioncategory?.name ?? null,
          })),
        );
      } catch (error) {
        console.error("Failed to load featured solutions", error);
        toast.error("Không tải được dữ liệu giải pháp nổi bật.");
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

  async function handleDeleteFeaturedSolution(id: string) {
    const confirmed = await confirmToast("Xóa giải pháp nổi bật này?");
    if (!confirmed) return;
    updateLoadingMap(`featured-solution-${id}`, true);
    try {
      const res = await fetch(`/api/admin/featured-solutions/${id}`,
        {
          method: "DELETE",
          headers: makeHeaders(),
        },
      );
      if (!res.ok) throw new Error(await res.text());
      setFeaturedSolutions((prev) => prev.filter((f) => f.id !== id));
      toast.success("Đã xóa giải pháp nổi bật");
    } catch (error) {
      console.error("Failed to delete featured solution", error);
      toast.error("Không thể xóa giải pháp nổi bật");
    } finally {
      updateLoadingMap(`featured-solution-${id}`, false);
    }
  }

  const featuredSolutionIds = useMemo(
    () => new Set(featuredSolutions.map((item) => item.solutionId)),
    [featuredSolutions],
  );

  const solutionSlots = useMemo(() => {
    const sorted = [...featuredSolutions].sort((a, b) => {
      const orderA = a.sortOrder ?? 0;
      const orderB = b.sortOrder ?? 0;
      if (orderA !== orderB) return orderA - orderB;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
    return Array.from({ length: 10 }, (_, idx) => sorted[idx] ?? null);
  }, [featuredSolutions]);

  async function handleAssignFeaturedSolution(solutionId: string, slotIndex: number) {
    updateLoadingMap(`solution-slot-${slotIndex}`, true);
    try {
      const payload = {
        solutionId,
        title: null,
        description: null,
        sortOrder: slotIndex,
        isActive: true,
        startDate: null,
        endDate: null,
      };
      const res = await fetch("/api/admin/featured-solutions", {
        method: "POST",
        headers: makeHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      setFeaturedSolutions((prev) => [...prev, json.data]);
      toast.success("Đã thêm giải pháp nổi bật");
      setSolutionSlotSelection(null);
      setSolutionFilter("");
    } catch (error) {
      console.error("Failed to assign featured solution", error);
      toast.error("Không thể thêm giải pháp này.");
    } finally {
      updateLoadingMap(`solution-slot-${slotIndex}`, false);
    }
  }

  const filteredSolutions = useMemo(() => {
    const keyword = solutionFilter.trim().toLowerCase();
    const pool = keyword
      ? availableSolutions.filter((solution) => {
          const haystack = `${solution.title} ${solution.slug}`.toLowerCase();
          return haystack.includes(keyword);
        })
      : availableSolutions;
    return pool.filter((solution) => !featuredSolutionIds.has(solution.id));
  }, [availableSolutions, solutionFilter, featuredSolutionIds]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">Giải pháp nổi bật</h1>
        <p className="text-gray-600">Chọn các giải pháp hiển thị nổi bật trên trang chủ.</p>
      </header>

      {pageLoading ? (
        <div className="flex items-center gap-2 text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Đang tải dữ liệu...
        </div>
      ) : (
        <section className="rounded-2xl border bg-white p-6 shadow-sm space-y-6">
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-blue-500" />
            <h2 className="text-lg font-semibold text-gray-900">Danh sách nổi bật</h2>
          </div>
          <p className="text-sm text-gray-500">
            Chọn các giải pháp để hiển thị nổi bật trên trang chủ hoặc các trang khác.
          </p>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
            {solutionSlots.map((slotItem, index) => (
              <button
                key={index}
                type="button"
                onClick={() =>
                  slotItem
                    ? void handleDeleteFeaturedSolution(slotItem.id)
                    : setSolutionSlotSelection(index)
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
                    {slotItem.solution.coverImage ? (
                      <div className="relative w-14 h-14 rounded-xl overflow-hidden border border-white shadow-sm">
                        <Image
                          src={slotItem.solution.coverImage}
                          alt={slotItem.solution.title}
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
                        {slotItem.solution.title}
                      </div>
                      <div className="text-xs text-gray-500 truncate">
                        Slug: {slotItem.solution.slug}
                      </div>
                      {slotItem.solution.categoryName && (
                        <div className="text-xs text-gray-500 truncate">
                          {slotItem.solution.categoryName}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center gap-1 text-blue-600 py-6">
                    <Plus className="h-5 w-5" />
                    <span className="text-sm font-semibold">Thêm giải pháp</span>
                    <span className="text-xs text-gray-500 text-center">Click để chọn nhanh</span>
                  </div>
                )}
              </button>
            ))}
          </div>
          <div className="text-xs text-gray-500 text-right">
            Đã sử dụng {featuredSolutions.length}/10 ô
          </div>

          {solutionSlotSelection !== null && (
            <div className="border-t pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="font-semibold text-gray-900 flex items-center gap-2">
                  <Plus className="h-4 w-4" /> Chọn giải pháp cho ô {solutionSlotSelection + 1}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSolutionSlotSelection(null);
                    setSolutionFilter("");
                  }}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Hủy
                </button>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-600">Tìm giải pháp</label>
                <input
                  type="text"
                  placeholder="Nhập tên hoặc slug..."
                  value={solutionFilter}
                  onChange={(e) => setSolutionFilter(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div className="border rounded-xl max-h-72 overflow-y-auto divide-y">
                {filteredSolutions.length === 0 ? (
                  <div className="p-3 text-sm text-gray-500">
                    Không còn giải pháp nào khả dụng để thêm.
                  </div>
                ) : (
                  filteredSolutions.map((solution) => (
                    <button
                      key={solution.id}
                      type="button"
                      onClick={() => handleAssignFeaturedSolution(solution.id, solutionSlotSelection)}
                      disabled={loadingMap[`solution-slot-${solutionSlotSelection}`]}
                      className="w-full flex items-center gap-3 p-2 hover:bg-gray-50 text-left transition disabled:opacity-60"
                    >
                      {solution.coverImage ? (
                        <div className="relative w-12 h-12 rounded overflow-hidden shrink-0">
                          <Image
                            src={solution.coverImage}
                            alt={solution.title}
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
                          {solution.title}
                        </div>
                        <div className="text-xs text-gray-500 truncate">
                          Slug: {solution.slug}
                        </div>
                        {solution.categoryName && (
                          <div className="text-xs text-gray-500 truncate">
                            {solution.categoryName}
                          </div>
                        )}
                      </div>
                      <span className="text-xs font-semibold text-blue-600">
                        {loadingMap[`solution-slot-${solutionSlotSelection}`] ? (
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
