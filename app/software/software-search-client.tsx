"use client";

import { startTransition, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Search, SlidersHorizontal, X, ChevronLeft, ChevronRight } from "lucide-react";

export type SoftwareCard = {
  id: string;
  slug: string;
  title: string;
  category?: { id?: string; slug?: string; name?: string } | null;
  image?: string | null;
  summary?: string | null;
  isFeatured?: boolean;
};

export type SoftwareCategoryOption = { id: string; slug: string; name: string };

type SoftwareSearchClientProps = {
  initialData?: SoftwareCard[];
  initialTotal?: number;
  initialQuery?: { q?: string; category?: string; page?: number; pageSize?: number };
  initialCategories?: SoftwareCategoryOption[];
};

export default function SoftwareSearchClient({
  initialData = [],
  initialTotal = 0,
  initialQuery,
  initialCategories = [],
}: SoftwareSearchClientProps = {}) {
  const router = useRouter();
  const sp = useSearchParams();

  const defaultQ = sp.get("q") ?? initialQuery?.q ?? "";
  const defaultCategory = sp.get("category") ?? initialQuery?.category ?? "";
  const defaultPage = Number(sp.get("page") ?? initialQuery?.page ?? 1);
  const pageSize = initialQuery?.pageSize ?? 20;

  const [q, setQ] = useState(defaultQ);
  const [page, setPage] = useState(defaultPage);
  const [category, setCategory] = useState(defaultCategory);

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<SoftwareCard[]>(initialData);
  const [total, setTotal] = useState(initialTotal);
  const [categories, setCategories] =
    useState<SoftwareCategoryOption[]>(initialCategories);
  const [showFilters, setShowFilters] = useState(false);

  const params = useMemo(() => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (category) p.set("category", category);
    p.set("page", String(page));
    p.set("pageSize", String(pageSize));
    return p;
  }, [q, category, page, pageSize]);

  useEffect(() => {
    const url = `/api/software?${params.toString()}`;
    router.replace(`/software?${params.toString()}`, { scroll: false });

    let aborted = false;
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(url);
        const json = await res.json();
        if (!aborted) {
          setData(json.data ?? []);
          setTotal(json.meta?.total ?? 0);
        }
      } finally {
        if (!aborted) setLoading(false);
      }
    };
    void load();

    return () => {
      aborted = true;
    };
  }, [params, router]);

  useEffect(() => {
    startTransition(() => setPage(1));
  }, [q, category]);

  // Load categories once if chưa có dữ liệu ban đầu
  useEffect(() => {
    if (categories.length > 0) return;
    let aborted = false;
    fetch("/api/software/categories")
      .then((r) => r.json())
      .then((json) => {
        if (!aborted) setCategories(json.data ?? []);
      })
      .catch(() => {
        if (!aborted) setCategories([]);
      });
    return () => {
      aborted = true;
    };
  }, [categories.length]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const hasActiveFilters = Boolean(q || category);

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-50 to-blue-50/30">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="mb-4 sm:mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Phần mềm &amp; dịch vụ
          </h1>
          <p className="text-gray-600 text-sm">
            Danh sách phần mềm và dịch vụ triển khai của AHSO.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 mb-4">
          <div className="relative">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Tìm phần mềm / dịch vụ…"
              className="w-full rounded-xl border border-gray-200 px-4 py-3 pl-11 bg-white shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-50 outline-none"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          <aside className="hidden lg:block w-64 shrink-0">
            <div className="bg-white rounded-2xl border border-gray-200 p-5 sticky top-6">
              <div className="flex items-center gap-2 mb-4">
                <SlidersHorizontal className="h-5 w-5 text-gray-700" />
                <h3 className="font-semibold text-gray-900">Bộ lọc</h3>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Danh mục
                  </label>
                  <select
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-50 outline-none text-sm"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    <option value="">Tất cả</option>
                    {categories.map((c) => (
                      <option key={c.slug} value={c.slug}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {hasActiveFilters && (
                  <button
                    onClick={() => {
                      setQ("");
                      setCategory("");
                    }}
                    className="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    <X className="h-4 w-4" />
                    Xóa bộ lọc
                  </button>
                )}
              </div>
            </div>
          </aside>

          <div className="flex-1 min-w-0">
            <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="lg:hidden flex items-center gap-2 px-4 py-2 border-2 border-gray-200 rounded-xl hover:bg-gray-50 text-sm font-medium"
                >
                  <SlidersHorizontal className="h-4 w-4" />
                  Bộ lọc
                </button>

                <div className="text-sm text-gray-600">
                  {loading ? "Đang tải..." : `${total.toLocaleString()} kết quả`}
                </div>
              </div>

              {showFilters && (
                <div className="lg:hidden mt-4 pt-4 border-t border-gray-200 space-y-3">
                  <select
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    <option value="">Tất cả danh mục</option>
                    {categories.map((c) => (
                      <option key={c.slug} value={c.slug}>
                        {c.name}
                      </option>
                    ))}
                  </select>

                  {hasActiveFilters && (
                    <button
                      onClick={() => {
                        setQ("");
                        setCategory("");
                      }}
                      className="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                    >
                      <X className="h-4 w-4" />
                      Xóa bộ lọc
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4">
              {loading
                ? Array.from({ length: pageSize }).map((_, i) => (
                    <div
                      key={i}
                      className="animate-pulse rounded-2xl border bg-white overflow-hidden"
                    >
                      <div className="aspect-square bg-gray-100" />
                      <div className="p-4 space-y-3">
                        <div className="h-4 bg-gray-100 rounded" />
                        <div className="h-4 w-2/3 bg-gray-100 rounded" />
                      </div>
                    </div>
                  ))
                : data.map((x) => (
                    <article
                      key={x.id}
                      className="border rounded-2xl bg-white shadow-sm hover:shadow-md transition flex flex-col h-full overflow-hidden"
                    >
                      <Link href={`/software/${encodeURIComponent(x.slug)}`} className="block">
                        {x.image ? (
                          <div className="relative aspect-square w-full overflow-hidden bg-gray-100">
                            <Image
                              src={x.image}
                              alt={x.title}
                              fill
                              className="object-cover"
                              sizes="(min-width: 1280px) 16vw, (min-width: 768px) 25vw, 100vw"
                            />
                            {x.isFeatured && (
                              <span className="absolute left-3 top-3 rounded-full bg-amber-500 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-white shadow">
                                Nổi bật
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="aspect-square w-full bg-gray-100" />
                        )}
                      </Link>

                      <div className="p-4 flex-1 flex flex-col">
                        <h3 className="font-semibold line-clamp-2">{x.title}</h3>
                        {x.category?.name ? (
                          <div className="mt-1 text-sm text-gray-600">
                            Danh mục:{" "}
                            <span className="font-medium">{x.category.name}</span>
                          </div>
                        ) : null}
                        {x.summary && (
                          <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                            {x.summary}
                          </p>
                        )}
                        <div className="mt-auto pt-3">
                          <Link
                            href={`/software/${encodeURIComponent(x.slug)}`}
                            className="inline-flex items-center justify-center w-full rounded-md bg-blue-600 text-white px-4 py-2 text-sm font-semibold hover:bg-blue-700"
                          >
                            Xem chi tiết
                          </Link>
                        </div>
                      </div>
                    </article>
                  ))}
            </div>

            {!loading && data.length === 0 && (
              <div className="text-center py-16 bg-white rounded-2xl border border-gray-200 mt-4">
                <Search className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Không tìm thấy phần mềm
                </h3>
                <p className="text-gray-600 mb-6">
                  Thử điều chỉnh bộ lọc hoặc từ khóa tìm kiếm
                </p>
                {hasActiveFilters && (
                  <button
                    onClick={() => {
                      setQ("");
                      setCategory("");
                    }}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-medium"
                  >
                    <X className="h-4 w-4" />
                    Xóa bộ lọc
                  </button>
                )}
              </div>
            )}

            {totalPages > 1 && !loading && (
              <div className="mt-8 flex items-center justify-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="p-2 rounded-xl border-2 border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition-colors"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>

                <div className="flex items-center gap-2">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (page <= 3) {
                      pageNum = i + 1;
                    } else if (page >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = page - 2 + i;
                    }

                    return (
                      <button
                        key={pageNum}
                        onClick={() => setPage(pageNum)}
                        className={`min-w-10 h-10 rounded-xl font-medium transition-all ${
                          page === pageNum
                            ? "bg-blue-600 text-white shadow-lg"
                            : "border-2 border-gray-200 hover:border-blue-300 hover:bg-blue-50"
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="p-2 rounded-xl border-2 border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition-colors"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
