"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { del, getJSON, patchJSON, postJSON } from "@/app/admin/_lib/fetcher";
import { confirmToast } from "@/lib/confirm-toast";
import { ContentManagementNav } from "@/components/admin/content/ContentManagementNav";
import {
  configByKind,
  getCategoryName,
  statusLabels,
  type ArticleRow,
  type ContentKind,
  type ContentStatus,
  type ListResp,
} from "@/components/admin/content/content-article-config";

const STATUS_OPTIONS: ContentStatus[] = ["DRAFT", "PUBLISHED", "ARCHIVED"];
const FEATURED_LIMIT = 10;
const FEATURED_FETCH_SIZE = 200;

type FeaturedRow = {
  id: string;
  softwareId?: string;
  solutionId?: string;
  sortOrder: number;
  isActive: boolean;
};

export function ContentArticleManager({ kind }: { kind: ContentKind }) {
  const config = configByKind[kind];
  const [rows, setRows] = useState<ArticleRow[]>([]);
  const [featuredRows, setFeaturedRows] = useState<FeaturedRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | ContentStatus>("");
  const [statusSavingId, setStatusSavingId] = useState<string | null>(null);
  const [featuredSavingId, setFeaturedSavingId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 20;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const params = useMemo(() => {
    const sp = new URLSearchParams();
    if (query) sp.set("q", query);
    if (statusFilter) sp.set("status", statusFilter);
    sp.set("page", String(page));
    sp.set("pageSize", String(pageSize));
    return sp.toString();
  }, [page, query, statusFilter]);

  const featuredByArticleId = useMemo(() => {
    const entries = featuredRows.map((item) => {
      const articleId = kind === "software" ? item.softwareId : item.solutionId;
      return articleId ? ([articleId, item] as const) : null;
    });
    return new Map(entries.filter(Boolean) as Array<readonly [string, FeaturedRow]>);
  }, [featuredRows, kind]);

  const featuredCount = featuredRows.length;

  useEffect(() => {
    let ignore = false;

    async function loadData() {
      setLoading(true);
      try {
        const [listRes, featuredRes] = await Promise.all([
          getJSON<ListResp<ArticleRow>>(`${config.apiBase}?${params}`),
          getJSON<ListResp<FeaturedRow>>(`${config.featuredApi}?pageSize=${FEATURED_FETCH_SIZE}`),
        ]);
        if (ignore) return;
        setRows(listRes.data);
        setTotal(listRes.meta.total);
        setFeaturedRows(featuredRes.data);
      } catch {
        if (!ignore) toast.error(`Không thể tải ${config.title.toLowerCase()}.`);
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    void loadData();
    return () => {
      ignore = true;
    };
  }, [config.apiBase, config.featuredApi, config.title, params]);

  useEffect(() => {
    setPage(1);
  }, [query, statusFilter]);

  const refreshCurrentPage = async () => {
    const [listRes, featuredRes] = await Promise.all([
      getJSON<ListResp<ArticleRow>>(`${config.apiBase}?${params}`),
      getJSON<ListResp<FeaturedRow>>(`${config.featuredApi}?pageSize=${FEATURED_FETCH_SIZE}`),
    ]);
    setRows(listRes.data);
    setTotal(listRes.meta.total);
    setFeaturedRows(featuredRes.data);
  };

  const handleStatusChange = async (row: ArticleRow, nextStatus: ContentStatus) => {
    if (nextStatus === row.status) return;

    const accepted = await confirmToast("Đổi trạng thái bài viết?", {
      description: `Chuyển "${row.title}" từ "${statusLabels[row.status]}" sang "${statusLabels[nextStatus]}".`,
      confirmText: "Đổi trạng thái",
      cancelText: "Hủy",
      variant: "modal",
    });

    if (!accepted) return;

    setStatusSavingId(row.id);
    const toastId = toast.loading("Đang cập nhật trạng thái...");
    try {
      await patchJSON(`${config.apiBase}/${row.id}/status`, { status: nextStatus });
      setRows((current) => current.map((item) => (item.id === row.id ? { ...item, status: nextStatus } : item)));
      toast.success("Đã cập nhật trạng thái bài viết.", { id: toastId });
    } catch {
      toast.error("Không thể cập nhật trạng thái bài viết.", { id: toastId });
    } finally {
      setStatusSavingId(null);
    }
  };

  const handleFeaturedToggle = async (row: ArticleRow) => {
    const featured = featuredByArticleId.get(row.id);

    if (!featured && row.status !== "PUBLISHED") {
      toast.warning("Chỉ bài viết đã xuất bản mới có thể thêm vào nổi bật. Vui lòng đổi trạng thái sang Đã xuất bản trước.");
      return;
    }

    if (!featured && featuredCount >= FEATURED_LIMIT) {
      toast.warning(`Danh sách nổi bật đã đủ ${featuredCount}/${FEATURED_LIMIT}. Vui lòng gỡ một bài viết nổi bật cũ trước.`);
      return;
    }

    const accepted = await confirmToast(featured ? "Gỡ bài viết nổi bật?" : "Thêm bài viết nổi bật?", {
      description: featured
        ? `"${row.title}" sẽ không còn hiển thị trong nhóm nổi bật.`
        : `"${row.title}" sẽ được thêm vào nhóm nổi bật (${featuredCount + 1}/${FEATURED_LIMIT}).`,
      confirmText: featured ? "Gỡ nổi bật" : "Thêm nổi bật",
      cancelText: "Hủy",
      variant: "modal",
    });

    if (!accepted) return;

    setFeaturedSavingId(row.id);
    const toastId = toast.loading(featured ? "Đang gỡ bài viết nổi bật..." : "Đang thêm bài viết nổi bật...");
    try {
      if (featured) {
        await del(`${config.featuredApi}/${featured.id}`);
        setFeaturedRows((current) => current.filter((item) => item.id !== featured.id));
        setRows((current) => current.map((item) => (item.id === row.id ? { ...item, isFeatured: false } : item)));
        toast.success("Đã gỡ bài viết nổi bật.", { id: toastId });
      } else {
        const created = await postJSON<{ data: FeaturedRow }>(config.featuredApi, {
          [config.featuredEntityIdKey]: row.id,
          sortOrder: featuredCount,
          isActive: true,
        });
        setFeaturedRows((current) => [...current, created.data]);
        setRows((current) => current.map((item) => (item.id === row.id ? { ...item, isFeatured: true } : item)));
        toast.success("Đã thêm bài viết nổi bật.", { id: toastId });
      }
    } catch {
      toast.error(featured ? "Không thể gỡ bài viết nổi bật." : "Không thể thêm bài viết nổi bật.", { id: toastId });
    } finally {
      setFeaturedSavingId(null);
    }
  };

  const handleDelete = async (row: ArticleRow) => {
    const accepted = await confirmToast("Xóa bài viết?", {
      description: `Bài viết "${row.title}" sẽ bị xóa khỏi hệ thống.`,
      confirmText: "Xóa",
      cancelText: "Hủy",
      variant: "modal",
    });

    if (!accepted) return;

    const toastId = toast.loading("Đang xóa bài viết...");
    try {
      await del(`${config.apiBase}/${row.id}`);
      toast.success("Đã xóa bài viết.", { id: toastId });
      await refreshCurrentPage();
    } catch {
      toast.error("Không thể xóa bài viết.", { id: toastId });
    }
  };

  return (
    <div className="space-y-5">
      <ContentManagementNav />

      <section className="rounded-md border border-slate-200 bg-white">
        <div className="flex flex-col gap-4 border-b border-slate-200 p-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-950">{config.title}</h1>
            <p className="mt-1 text-sm text-slate-600">{config.description}</p>
          </div>
          <Link
            className="inline-flex h-9 items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-600"
            href={config.createHref}
          >
            {config.createLabel}
          </Link>
        </div>

        <div className="grid gap-3 border-b border-slate-200 p-5 md:grid-cols-[minmax(0,1fr)_220px]">
          <Input
            aria-label="Tìm kiếm bài viết"
            onChange={(event) => setQuery(event.target.value)}
            placeholder={config.searchPlaceholder}
            value={query}
          />
          <select
            aria-label="Lọc trạng thái"
            className="h-9 rounded-md border border-gray-300 bg-white px-3 text-sm text-slate-800 shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-600"
            onChange={(event) => setStatusFilter(event.target.value as "" | ContentStatus)}
            value={statusFilter}
          >
            <option value="">Tất cả trạng thái</option>
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {statusLabels[status]}
              </option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-[860px]">
            <div className="grid grid-cols-[112px_minmax(280px,1fr)_130px_190px_100px] border-b border-slate-200 bg-slate-50 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <div>Ảnh bìa</div>
              <div>Tên</div>
              <div>Nổi bật {featuredCount}/{FEATURED_LIMIT}</div>
              <div>Trạng thái</div>
              <div className="text-right">Xóa</div>
            </div>

            {loading ? (
              <div className="px-5 py-10 text-center text-sm text-slate-500">Đang tải danh sách bài viết...</div>
            ) : rows.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-slate-500">{config.emptyText}</div>
            ) : (
              rows.map((row) => {
                const isFeatured = Boolean(featuredByArticleId.get(row.id) || row.isFeatured);

                return (
                  <div
                    className="grid grid-cols-[112px_minmax(280px,1fr)_130px_190px_100px] items-center border-b border-slate-100 px-5 py-3 last:border-b-0 hover:bg-slate-50"
                    key={row.id}
                  >
                    <Link aria-label={`Chỉnh sửa ${row.title}`} href={config.editHref(row.id)}>
                      {row.coverImage ? (
                        <img
                          alt={row.title}
                          className="h-14 w-20 rounded-md border border-slate-200 object-cover"
                          src={row.coverImage}
                        />
                      ) : (
                        <div className="flex h-14 w-20 items-center justify-center rounded-md border border-dashed border-slate-300 bg-slate-50 text-xs text-slate-500">
                          Chưa có ảnh
                        </div>
                      )}
                    </Link>

                    <Link className="min-w-0 pr-6" href={config.editHref(row.id)}>
                      <div className="truncate text-sm font-semibold text-slate-950">{row.title}</div>
                      <div className="mt-1 truncate text-xs text-slate-500">{getCategoryName(row, kind)}</div>
                    </Link>

                    <button
                      aria-label={isFeatured ? `Gỡ nổi bật ${row.title}` : `Thêm nổi bật ${row.title}`}
                      className="h-9 w-11 rounded-md border border-slate-200 bg-white text-xl leading-none transition-colors hover:border-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={featuredSavingId === row.id}
                      onClick={() => void handleFeaturedToggle(row)}
                      title={isFeatured ? "Bài viết nổi bật" : "Bài viết bình thường"}
                      type="button"
                    >
                      <span className={isFeatured ? "text-amber-400" : "text-white [text-shadow:0_0_0_#94a3b8]"}>
                        ★
                      </span>
                    </button>

                    <select
                      aria-label={`Đổi trạng thái ${row.title}`}
                      className="h-9 w-40 rounded-md border border-gray-300 bg-white px-3 text-sm text-slate-800 shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={statusSavingId === row.id}
                      onChange={(event) => void handleStatusChange(row, event.target.value as ContentStatus)}
                      value={row.status}
                    >
                      {STATUS_OPTIONS.map((status) => (
                        <option key={status} value={status}>
                          {statusLabels[status]}
                        </option>
                      ))}
                    </select>

                    <div className="text-right">
                      <Button
                        className="text-red-600 hover:text-red-700"
                        onClick={() => void handleDelete(row)}
                        type="button"
                        variant="ghost"
                      >
                        Xóa
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-200 p-5 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
          <span>
            Hiển thị {rows.length} / {total} bài viết
          </span>
          <div className="flex items-center gap-2">
            <Button
              disabled={page <= 1 || loading}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              type="button"
              variant="outline"
            >
              Trước
            </Button>
            <span className="min-w-20 text-center">
              Trang {page}/{totalPages}
            </span>
            <Button
              disabled={page >= totalPages || loading}
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              type="button"
              variant="outline"
            >
              Sau
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
