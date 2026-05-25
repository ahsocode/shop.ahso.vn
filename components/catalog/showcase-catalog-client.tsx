"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Layers3,
  Loader2,
  Search,
  SlidersHorizontal,
  Sparkles,
  Star,
  X,
} from "lucide-react";
import { startTransition, useEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const FALLBACK_IMAGE = "/logo.png";

export type ShowcaseCatalogItem = {
  id: string;
  slug: string;
  title: string;
  category?: { id?: string; slug?: string; name?: string } | null;
  image?: string | null;
  summary?: string | null;
  isFeatured?: boolean;
};

export type ShowcaseCategoryOption = {
  id: string;
  slug: string;
  name: string;
};

type ShowcaseCatalogClientProps<TItem extends ShowcaseCatalogItem> = {
  initialData?: TItem[];
  initialTotal?: number;
  initialQuery?: {
    q?: string;
    category?: string;
    page?: number;
    pageSize?: number;
  };
  initialCategories?: ShowcaseCategoryOption[];
  config: {
    basePath: string;
    apiPath: string;
    categoriesApiPath: string;
    detailPath: string;
    eyebrow: string;
    title: string;
    description: string;
    searchPlaceholder: string;
    countLabel: string;
    allCategoriesLabel: string;
    emptyTitle: string;
    emptyDescription: string;
    primaryCtaLabel: string;
    supportText: string;
    tone: "solutions" | "software";
  };
};

type ApiPayload<TItem> = {
  data?: TItem[];
  meta?: { total?: number };
};

export default function ShowcaseCatalogClient<TItem extends ShowcaseCatalogItem>({
  initialData = [],
  initialTotal = 0,
  initialQuery,
  initialCategories = [],
  config,
}: ShowcaseCatalogClientProps<TItem>) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const cardsRef = useRef<HTMLDivElement | null>(null);

  const defaultQ = searchParams.get("q") ?? initialQuery?.q ?? "";
  const defaultCategory =
    searchParams.get("category") ?? initialQuery?.category ?? "";
  const defaultPage = Number(searchParams.get("page") ?? initialQuery?.page ?? 1);
  const pageSize = initialQuery?.pageSize ?? 20;

  const [q, setQ] = useState(defaultQ);
  const [category, setCategory] = useState(defaultCategory);
  const [page, setPage] = useState(defaultPage);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<TItem[]>(initialData);
  const [total, setTotal] = useState(initialTotal);
  const [categories, setCategories] =
    useState<ShowcaseCategoryOption[]>(initialCategories);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const params = useMemo(() => {
    const p = new URLSearchParams();
    if (q.trim()) p.set("q", q.trim());
    if (category) p.set("category", category);
    p.set("page", String(page));
    p.set("pageSize", String(pageSize));
    return p;
  }, [category, page, pageSize, q]);

  useEffect(() => {
    router.replace(`${config.basePath}?${params.toString()}`, { scroll: false });

    let aborted = false;
    const controller = new AbortController();

    const run = async () => {
      setLoading(true);
      try {
        const response = await fetch(`${config.apiPath}?${params.toString()}`, {
          signal: controller.signal,
          headers: { Accept: "application/json" },
          cache: "no-store",
        });

        if (!response.ok) {
          if (!aborted) {
            setData([]);
            setTotal(0);
          }
          return;
        }

        const text = await response.text();
        if (!text.trim()) {
          if (!aborted) {
            setData([]);
            setTotal(0);
          }
          return;
        }

        const payload = JSON.parse(text) as ApiPayload<TItem>;
        if (!aborted) {
          setData(payload.data ?? []);
          setTotal(payload.meta?.total ?? 0);
        }
      } catch {
        if (!aborted) {
          setData([]);
          setTotal(0);
        }
      } finally {
        if (!aborted) setLoading(false);
      }
    };

    void run();

    return () => {
      aborted = true;
      controller.abort();
    };
  }, [config.apiPath, config.basePath, params, router]);

  useEffect(() => {
    startTransition(() => setPage(1));
  }, [category, q]);

  useEffect(() => {
    if (categories.length > 0) return;

    let aborted = false;
    fetch(config.categoriesApiPath, { headers: { Accept: "application/json" } })
      .then((response) => response.json())
      .then((json) => {
        if (!aborted) setCategories(json.data ?? []);
      })
      .catch(() => {
        if (!aborted) setCategories([]);
      });

    return () => {
      aborted = true;
    };
  }, [categories.length, config.categoriesApiPath]);

  useEffect(() => {
    if (!cardsRef.current || loading) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".catalog-card",
        { autoAlpha: 0, y: 18 },
        {
          autoAlpha: 1,
          y: 0,
          duration: 0.62,
          ease: "power4.out",
          stagger: 0.045,
        }
      );
    }, cardsRef);

    return () => ctx.revert();
  }, [data, loading]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const hasActiveFilters = Boolean(q.trim() || category);
  const featuredCount = data.filter((item) => item.isFeatured).length;
  const selectedCategory = categories.find((item) => item.slug === category);

  const clearFilters = () => {
    setQ("");
    setCategory("");
    setShowMobileFilters(false);
  };

  return (
    <main className="min-h-screen bg-[oklch(0.985_0.006_250)] text-slate-950">
      <section className="border-b border-slate-200/80 bg-[oklch(0.992_0.004_250)]/92">
        <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:px-8 lg:py-14">
          <div className="max-w-3xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">
              <Layers3 className="h-3.5 w-3.5" />
              {config.eyebrow}
            </div>
            <h1 className="text-4xl font-semibold tracking-normal text-slate-950 sm:text-5xl lg:text-6xl">
              {config.title}
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
              {config.description}
            </p>
          </div>

          <div className="self-end rounded-lg border border-slate-200 bg-[oklch(0.998_0.003_250)] p-5 shadow-sm">
            <div className="flex items-start justify-between gap-5">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  Đang hiển thị
                </p>
                <p className="mt-1 text-3xl font-semibold text-slate-950">
                  {total.toLocaleString("vi-VN")}
                </p>
              </div>
              <div className="rounded-md border border-amber-200 bg-amber-50 p-2 text-amber-700">
                <Sparkles className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-600">
              {config.supportText}
            </p>
            <Link
              href="/contact"
              className="mt-5 inline-flex h-9 w-full items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-600"
            >
              {config.primaryCtaLabel}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="hidden lg:block">
            <div className="sticky top-24 rounded-lg border border-slate-200 bg-[oklch(0.998_0.003_250)] p-4 shadow-sm">
              <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-950">
                <SlidersHorizontal className="h-4 w-4 text-blue-600" />
                Bộ lọc
              </div>

              <FilterList
                allLabel={config.allCategoriesLabel}
                categories={categories}
                selectedCategory={category}
                onSelect={setCategory}
              />

              {hasActiveFilters ? (
                <Button
                  type="button"
                  variant="outline"
                  className="mt-5 w-full border-slate-300 text-slate-700"
                  onClick={clearFilters}
                >
                  <X className="h-4 w-4" />
                  Xóa bộ lọc
                </Button>
              ) : null}
            </div>
          </aside>

          <div className="min-w-0">
            <div className="rounded-lg border border-slate-200 bg-[oklch(0.998_0.003_250)] p-3 shadow-sm sm:p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    value={q}
                    onChange={(event) => setQ(event.target.value)}
                    placeholder={config.searchPlaceholder}
                    className="h-11 border-slate-200 bg-[oklch(0.992_0.004_250)] pl-10 shadow-none"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="lg:hidden"
                    onClick={() => setShowMobileFilters((value) => !value)}
                  >
                    <SlidersHorizontal className="h-4 w-4" />
                    Bộ lọc
                  </Button>
                  {hasActiveFilters ? (
                    <Button type="button" variant="ghost" onClick={clearFilters}>
                      <X className="h-4 w-4" />
                      Xóa
                    </Button>
                  ) : null}
                </div>
              </div>

              {showMobileFilters ? (
                <div className="mt-4 border-t border-slate-200 pt-4 lg:hidden">
                  <FilterList
                    allLabel={config.allCategoriesLabel}
                    categories={categories}
                    selectedCategory={category}
                    onSelect={(value) => {
                      setCategory(value);
                      setShowMobileFilters(false);
                    }}
                  />
                </div>
              ) : null}
            </div>

            <div className="mt-5 flex flex-col gap-3 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
              <div>
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Đang tải dữ liệu
                  </span>
                ) : (
                  <span>
                    {total.toLocaleString("vi-VN")} {config.countLabel}
                    {selectedCategory ? ` trong ${selectedCategory.name}` : ""}
                  </span>
                )}
              </div>
              {featuredCount > 0 ? (
                <div className="inline-flex items-center gap-1.5 text-amber-700">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-500" />
                  {featuredCount.toLocaleString("vi-VN")} mục nổi bật trong trang này
                </div>
              ) : null}
            </div>

            <div
              ref={cardsRef}
              className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
            >
              {loading
                ? Array.from({ length: Math.min(pageSize, 9) }).map((_, index) => (
                    <CatalogSkeleton key={index} />
                  ))
                : data.map((item) => (
                    <CatalogCard
                      key={item.id}
                      item={item}
                      detailPath={config.detailPath}
                      tone={config.tone}
                    />
                  ))}
            </div>

            {!loading && data.length === 0 ? (
              <EmptyState
                title={config.emptyTitle}
                description={config.emptyDescription}
                hasActiveFilters={hasActiveFilters}
                onClear={clearFilters}
              />
            ) : null}

            {totalPages > 1 && !loading ? (
              <Pagination
                page={page}
                totalPages={totalPages}
                onChange={setPage}
              />
            ) : null}
          </div>
        </div>
      </section>
    </main>
  );
}

function FilterList({
  allLabel,
  categories,
  selectedCategory,
  onSelect,
}: {
  allLabel: string;
  categories: ShowcaseCategoryOption[];
  selectedCategory: string;
  onSelect: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => onSelect("")}
        className={cn(
          "flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm transition-colors",
          selectedCategory
            ? "border-slate-200 bg-transparent text-slate-600 hover:bg-slate-50"
            : "border-blue-200 bg-blue-50 text-blue-700"
        )}
      >
        {allLabel}
        {!selectedCategory ? <ArrowRight className="h-3.5 w-3.5" /> : null}
      </button>

      {categories.map((item) => {
        const active = selectedCategory === item.slug;
        return (
          <button
            type="button"
            key={item.slug}
            onClick={() => onSelect(item.slug)}
            className={cn(
              "flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm transition-colors",
              active
                ? "border-blue-200 bg-blue-50 text-blue-700"
                : "border-slate-200 bg-transparent text-slate-600 hover:bg-slate-50"
            )}
          >
            <span className="line-clamp-1">{item.name}</span>
            {active ? <ArrowRight className="h-3.5 w-3.5" /> : null}
          </button>
        );
      })}
    </div>
  );
}

function CatalogCard({
  item,
  detailPath,
  tone,
}: {
  item: ShowcaseCatalogItem;
  detailPath: string;
  tone: "solutions" | "software";
}) {
  const imageSrc = item.image || FALLBACK_IMAGE;
  const href = `${detailPath}/${encodeURIComponent(item.slug)}`;
  const toneLabel = tone === "solutions" ? "Giải pháp" : "Phần mềm";

  return (
    <article className="catalog-card group overflow-hidden rounded-lg border border-slate-200 bg-[oklch(0.998_0.003_250)] shadow-sm transition-[border-color,transform,box-shadow] duration-300 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md">
      <Link href={href} className="block">
        <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
          <Image
            src={imageSrc}
            alt={item.title}
            fill
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.035]"
            sizes="(min-width: 1280px) 28vw, (min-width: 768px) 45vw, 100vw"
          />
          <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3">
            <span className="rounded-full border border-slate-200 bg-[oklch(0.995_0.004_250)]/95 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600">
              {toneLabel}
            </span>
            {item.isFeatured ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-900">
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-600" />
                Nổi bật
              </span>
            ) : null}
          </div>
        </div>
      </Link>

      <div className="flex min-h-56 flex-col p-5">
        {item.category?.name ? (
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
            {item.category.name}
          </p>
        ) : null}
        <h2 className="text-xl font-semibold leading-snug text-slate-950">
          <Link href={href} className="transition-colors hover:text-blue-700">
            {item.title}
          </Link>
        </h2>
        {item.summary ? (
          <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">
            {item.summary}
          </p>
        ) : (
          <p className="mt-3 text-sm leading-6 text-slate-500">
            AHSO sẽ cập nhật mô tả ngắn để người xem nắm nhanh phạm vi ứng dụng.
          </p>
        )}

        <Link
          href={href}
          className="mt-auto inline-flex items-center gap-2 pt-5 text-sm font-semibold text-slate-950 transition-colors hover:text-blue-700"
        >
          Xem chi tiết
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </Link>
      </div>
    </article>
  );
}

function CatalogSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-[oklch(0.998_0.003_250)]">
      <div className="aspect-[4/3] animate-pulse bg-slate-100" />
      <div className="space-y-4 p-5">
        <div className="h-3 w-28 animate-pulse rounded bg-slate-100" />
        <div className="h-5 w-4/5 animate-pulse rounded bg-slate-100" />
        <div className="space-y-2">
          <div className="h-3 animate-pulse rounded bg-slate-100" />
          <div className="h-3 w-2/3 animate-pulse rounded bg-slate-100" />
        </div>
      </div>
    </div>
  );
}

function EmptyState({
  title,
  description,
  hasActiveFilters,
  onClear,
}: {
  title: string;
  description: string;
  hasActiveFilters: boolean;
  onClear: () => void;
}) {
  return (
    <div className="mt-6 rounded-lg border border-dashed border-slate-300 bg-[oklch(0.998_0.003_250)] px-5 py-14 text-center">
      <Search className="mx-auto h-10 w-10 text-slate-300" />
      <h2 className="mt-4 text-xl font-semibold text-slate-950">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">
        {description}
      </p>
      {hasActiveFilters ? (
        <Button type="button" className="mt-6" onClick={onClear}>
          <X className="h-4 w-4" />
          Xóa bộ lọc
        </Button>
      ) : null}
    </div>
  );
}

function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}) {
  const pages = Array.from({ length: Math.min(5, totalPages) }, (_, index) => {
    if (totalPages <= 5) return index + 1;
    if (page <= 3) return index + 1;
    if (page >= totalPages - 2) return totalPages - 4 + index;
    return page - 2 + index;
  });

  return (
    <nav
      aria-label="Phân trang"
      className="mt-8 flex items-center justify-center gap-2"
    >
      <Button
        type="button"
        variant="outline"
        size="icon"
        disabled={page <= 1}
        onClick={() => onChange(Math.max(1, page - 1))}
        aria-label="Trang trước"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      {pages.map((pageNumber) => (
        <Button
          key={pageNumber}
          type="button"
          variant={page === pageNumber ? "default" : "outline"}
          className="min-w-10"
          onClick={() => onChange(pageNumber)}
          aria-current={page === pageNumber ? "page" : undefined}
        >
          {pageNumber}
        </Button>
      ))}

      <Button
        type="button"
        variant="outline"
        size="icon"
        disabled={page >= totalPages}
        onClick={() => onChange(Math.min(totalPages, page + 1))}
        aria-label="Trang sau"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </nav>
  );
}
