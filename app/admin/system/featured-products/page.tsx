"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { Loader2, Plus, Package, ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { confirmToast } from "@/lib/confirm-toast";
import { makeHeaders } from "@/app/admin/_lib/fetcher";

type FeaturedProduct = {
  id: string;
  productId: string;
  title: string | null;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  updatedAt: string;
  product: {
    id: string;
    name: string;
    slug: string;
    sku: string;
    price: number;
    coverImage: string | null;
    brandName: string | null;
  };
};

type ProductOption = {
  id: string;
  name: string;
  sku: string;
  coverImage: string | null;
  brandName: string | null;
};

const fetchJSON = async <T,>(url: string): Promise<T> => {
  const res = await fetch(url, { headers: makeHeaders() });
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()) as T;
};

export default function FeaturedProductsPage() {
  const [pageLoading, setPageLoading] = useState(true);
  const [featuredProducts, setFeaturedProducts] = useState<FeaturedProduct[]>([]);
  const [availableProducts, setAvailableProducts] = useState<ProductOption[]>([]);
  const [productFilter, setProductFilter] = useState("");
  const [slotSelection, setSlotSelection] = useState<number | null>(null);
  const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});
  const [bulkLoading, setBulkLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      try {
        const [featuredData, productListData] = await Promise.all([
          fetchJSON<{ data: FeaturedProduct[] }>("/api/admin/featured-products"),
          fetchJSON<{
            data: {
              id: string;
              name: string;
              sku: string;
              coverImage: string | null;
              brand?: { name?: string | null } | null;
            }[];
          }>("/api/admin/products?mode=options&pageSize=200"),
        ]);
        if (ignore) return;
        setFeaturedProducts(featuredData.data);
        setAvailableProducts(
          (productListData.data ?? []).map((product) => ({
            id: product.id,
            name: product.name,
            sku: product.sku,
            coverImage: product.coverImage ?? null,
            brandName: product.brand?.name ?? null,
          })),
        );
      } catch (error) {
        console.error("Failed to load featured products", error);
        toast.error("Không tải được dữ liệu sản phẩm nổi bật.");
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

  async function handleDeleteFeatured(id: string) {
    const confirmed = await confirmToast("Xóa sản phẩm nổi bật này?", {
      variant: "modal",
    });
    if (!confirmed) return;
    updateLoadingMap(`featured-${id}`, true);
    try {
      const res = await fetch(`/api/admin/featured-products/${id}`,
        {
          method: "DELETE",
          headers: makeHeaders(),
        },
      );
      if (!res.ok) throw new Error(await res.text());
      setFeaturedProducts((prev) => prev.filter((f) => f.id !== id));
      setSelectedIds((prev) => prev.filter((x) => x !== id));
      toast.success("Đã xóa sản phẩm nổi bật");
    } catch (error) {
      console.error("Failed to delete featured product", error);
      toast.error("Không thể xóa sản phẩm nổi bật");
    } finally {
      updateLoadingMap(`featured-${id}`, false);
    }
  }

  const featuredProductIds = useMemo(
    () => new Set(featuredProducts.map((item) => item.productId)),
    [featuredProducts],
  );

  const sortedFeatured = useMemo(() => {
    const sorted = [...featuredProducts].sort((a, b) => {
      const orderA = a.sortOrder ?? 0;
      const orderB = b.sortOrder ?? 0;
      if (orderA !== orderB) return orderA - orderB;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
    return sorted;
  }, [featuredProducts]);

  const slots = useMemo(
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
      toast.info("Không có sản phẩm nổi bật để xóa.");
      return;
    }
    const message =
      mode === "all"
        ? "Xóa toàn bộ sản phẩm nổi bật?"
        : `Xóa ${selectedIds.length} sản phẩm nổi bật đã chọn?`;
    const confirmed = await confirmToast(message, { variant: "modal" });
    if (!confirmed) return;
    setBulkLoading(true);
    try {
      const res = await fetch("/api/admin/featured-products/bulk-delete", {
        method: "POST",
        headers: makeHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ mode, ids: selectedIds }),
      });
      if (!res.ok) throw new Error(await res.text());
      const json = (await res.json()) as { deletedIds?: string[] };
      const deletedIds = json.deletedIds ?? [];
      if (deletedIds.length) {
        setFeaturedProducts((prev) => prev.filter((f) => !deletedIds.includes(f.id)));
        setSelectedIds((prev) => prev.filter((id) => !deletedIds.includes(id)));
        toast.success(`Đã xóa ${deletedIds.length} sản phẩm nổi bật`);
      } else {
        toast.info("Không có sản phẩm nổi bật để xóa.");
      }
    } catch (error) {
      console.error("Failed to bulk delete featured products", error);
      toast.error("Không thể xóa sản phẩm nổi bật");
    } finally {
      setBulkLoading(false);
    }
  }

  async function handleAssignFeatured(productId: string, slotIndex: number) {
    updateLoadingMap(`slot-${slotIndex}`, true);
    try {
      const payload = {
        productId,
        title: null,
        description: null,
        sortOrder: slotIndex,
        isActive: true,
        startDate: null,
        endDate: null,
      };
      const res = await fetch("/api/admin/featured-products", {
        method: "POST",
        headers: makeHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      setFeaturedProducts((prev) => [...prev, json.data]);
      toast.success("Đã thêm vào danh sách nổi bật");
      setSlotSelection(null);
      setProductFilter("");
    } catch (error) {
      console.error("Failed to assign featured product", error);
      toast.error("Không thể thêm sản phẩm này.");
    } finally {
      updateLoadingMap(`slot-${slotIndex}`, false);
    }
  }

  const filteredProducts = useMemo(() => {
    const keyword = productFilter.trim().toLowerCase();
    const pool = keyword
      ? availableProducts.filter((product) => {
          const haystack = `${product.name} ${product.sku}`.toLowerCase();
          return haystack.includes(keyword);
        })
      : availableProducts;
    return pool.filter((product) => !featuredProductIds.has(product.id));
  }, [availableProducts, productFilter, featuredProductIds]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">Sản phẩm nổi bật</h1>
        <p className="text-gray-600">Chọn các sản phẩm hiển thị nổi bật trên trang chủ.</p>
      </header>

      {pageLoading ? (
        <div className="flex items-center gap-2 text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Đang tải dữ liệu...
        </div>
      ) : (
        <section className="rounded-2xl border bg-white p-6 shadow-sm space-y-6">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-blue-500" />
            <h2 className="text-lg font-semibold text-gray-900">Danh sách nổi bật</h2>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-gray-500">
              Chọn các sản phẩm để hiển thị ở vị trí nổi bật trên trang chủ hoặc các trang khác.
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
            {slots.map((slotItem, index) => (
              <button
                key={index}
                type="button"
                onClick={() => (slotItem ? void handleDeleteFeatured(slotItem.id) : setSlotSelection(index))}
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
                        aria-label={`Chọn ${slotItem.product.name}`}
                      />
                    </div>
                    {slotItem.product.coverImage ? (
                      <div className="relative w-14 h-14 rounded-xl overflow-hidden border border-white shadow-sm">
                        <Image
                          src={slotItem.product.coverImage}
                          alt={slotItem.product.name}
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
                        {slotItem.product.name}
                      </div>
                      <div className="text-xs text-gray-500">SKU: {slotItem.product.sku}</div>
                      {slotItem.product.brandName && (
                        <div className="text-xs text-gray-500">{slotItem.product.brandName}</div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center gap-1 text-blue-600 py-6">
                    <Plus className="h-5 w-5" />
                    <span className="text-sm font-semibold">Thêm sản phẩm</span>
                    <span className="text-xs text-gray-500 text-center">Click để chọn nhanh</span>
                  </div>
                )}
              </button>
            ))}
          </div>
          <div className="text-xs text-gray-500 text-right">
            Đã sử dụng {featuredProducts.length}/10 ô
          </div>

          {slotSelection !== null && (
            <div className="border-t pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="font-semibold text-gray-900 flex items-center gap-2">
                  <Plus className="h-4 w-4" /> Chọn sản phẩm cho ô {slotSelection + 1}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSlotSelection(null);
                    setProductFilter("");
                  }}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Hủy
                </button>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-600">Tìm sản phẩm</label>
                <input
                  type="text"
                  placeholder="Nhập tên hoặc SKU..."
                  value={productFilter}
                  onChange={(e) => setProductFilter(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div className="border rounded-xl max-h-72 overflow-y-auto divide-y">
                {filteredProducts.length === 0 ? (
                  <div className="p-3 text-sm text-gray-500">
                    Không còn sản phẩm nào khả dụng để thêm.
                  </div>
                ) : (
                  filteredProducts.map((product) => (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => handleAssignFeatured(product.id, slotSelection)}
                      disabled={loadingMap[`slot-${slotSelection}`]}
                      className="w-full flex items-center gap-3 p-2 hover:bg-gray-50 text-left transition disabled:opacity-60"
                    >
                      {product.coverImage ? (
                        <div className="relative w-12 h-12 rounded overflow-hidden shrink-0">
                          <Image
                            src={product.coverImage}
                            alt={product.name}
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
                          {product.name}
                        </div>
                        <div className="text-xs text-gray-500">SKU: {product.sku}</div>
                        {product.brandName && (
                          <div className="text-xs text-gray-500">{product.brandName}</div>
                        )}
                      </div>
                      <span className="text-xs font-semibold text-blue-600">
                        {loadingMap[`slot-${slotSelection}`] ? (
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
