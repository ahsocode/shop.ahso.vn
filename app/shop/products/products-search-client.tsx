// app/shop/products/products-search-client.tsx
"use client";

import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";
import { useCart } from "@/lib/hooks/useCart";
import {
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  ShoppingCart,
  Star,
  StarHalf,
  X,
  Grid3x3,
  List,
  SlidersHorizontal,
  Package,
  TrendingUp,
  Loader2,
  Clock,
  Award,
  Grid as GridIcon,
} from "lucide-react";

// Types
type BrandObj = { name: string; slug: string; logoUrl?: string; id?: string };
type ProductCard = {
  slug: string;
  name: string;
  sku: string;
  image: string;
  brand: string | BrandObj | null;
  brandSlug: string | null;
  category: string | null;
  price: number;
  currency: string | null;
  inStock: boolean;
  description?: string | null;
  ratingAvg?: number;
  ratingCount?: number;
  purchaseCount?: number;
};

type BrandOpt = { name: string; slug: string; productCount?: number };
type CategoryOpt = { name: string; slug: string; productCount?: number };
type ProductTypeOpt = {
  name: string;
  slug: string;
  productCount?: number;
  category?: { name: string; slug: string } | null;
};

type FiltersState = {
  q: string;
  brand: string;
  category: string;
  productType: string;
  minPrice: string;
  maxPrice: string;
  inStock: boolean;
  sort: string;
  page: number;
};

type Suggestion = {
  type: "product" | "brand" | "category" | "search" | "history";
  text: string;
  subtext?: string;
  url?: string;
  image?: string | null;
  icon?: string;
};

const SEARCH_HISTORY_KEY = "search_history";
const MAX_HISTORY = 5;

// Hooks
function useDebounced<T>(value: T, delay = 400) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

// Components
function StarRating({ value = 0, size = 14 }: { value?: number; size?: number }) {
  const full = Math.floor(value);
  const hasHalf = value - full >= 0.25 && value - full < 0.75;
  const rest = 5 - full - (hasHalf ? 1 : 0);
  return (
    <div className="inline-flex items-center gap-0.5 text-amber-400">
      {Array.from({ length: full }).map((_, i) => (
        <Star key={`f-${i}`} width={size} height={size} fill="currentColor" />
      ))}
      {hasHalf && <StarHalf width={size} height={size} fill="currentColor" />}
      {Array.from({ length: rest }).map((_, i) => (
        <Star key={`e-${i}`} width={size} height={size} className="opacity-25" />
      ))}
    </div>
  );
}

function AddToCartButton({ sku, name, image }: { sku: string; name: string; image: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { refresh: refreshCart } = useCart();

  async function handleAdd() {
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch("/api/cart/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ sku, qty: 1, name, image }),
      });
      if (res.status === 401) {
        const redirect = typeof window !== "undefined" ? window.location.pathname : "/shop/products";
        toast.error("Bạn cần đăng nhập để thêm sản phẩm vào giỏ.", {
          action: {
            label: "Đăng nhập",
            onClick: () => router.push(`/login?redirect=${encodeURIComponent(redirect)}`),
          },
        });
        return;
      }

      if (!res.ok) {
        const json = await res.json().catch(() => ({} as any));
        const err = (json?.error || json?.message || "").toUpperCase();
        if (res.status === 409 || err.includes("OUT_OF_STOCK")) {
          toast.error("Sản phẩm tạm hết hàng.");
          return;
        }
        if (res.status === 422 || err.includes("VALIDATION")) {
          toast.error("Dữ liệu không hợp lệ. Vui lòng thử lại.");
          return;
        }
        throw new Error(json?.error || json?.message || `Add to cart failed (${res.status})`);
      }

      try {
        await refreshCart();
      } catch {
        /* ignore */
      }

      toast.success("Đã thêm vào giỏ!", {
        description: name || sku,
        action: {
          label: "Xem giỏ",
          onClick: () => router.push("/cart"),
        },
      });
    } catch (e) {
      toast.error("Không thể thêm sản phẩm. Vui lòng thử lại.");
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleAdd}
      disabled={loading}
      className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl p-2.5 transition-all shadow-lg hover:shadow-xl active:scale-95"
      title="Thêm vào giỏ"
    >
      <ShoppingCart className="h-4 w-4" />
    </button>
  );
}

function ProductCard({ product, viewMode }: { product: ProductCard; viewMode: "grid" | "list" }) {
  const brandLabel = typeof product.brand === "string" ? product.brand : product.brand?.name ?? "—";
  const rating = Number(product.ratingAvg ?? 0);
  const ratingCount = Number(product.ratingCount ?? 0);
  const purchases = Number(product.purchaseCount ?? 0);

  if (viewMode === "list") {
    return (
      <div className="group bg-white rounded-2xl border border-gray-200 hover:border-blue-300 hover:shadow-xl transition-all duration-300 overflow-hidden">
        <div className="flex flex-col sm:flex-row">
          <Link
            href={`/shop/products/${product.slug}`}
            className="relative w-full sm:w-48 aspect-square sm:aspect-auto bg-gray-50 overflow-hidden shrink-0"
          >
            <Image
              src={product.image || "/logo.png"}
              alt={product.name}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-500"
            />
            {!product.inStock && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <span className="bg-white text-gray-900 px-3 py-1.5 rounded-full text-xs font-semibold">
                  Hết hàng
                </span>
              </div>
            )}
          </Link>

          <div className="p-5 flex-1 flex flex-col">
            <div className="flex items-start justify-between gap-4 mb-3">
              <div className="flex-1 min-w-0">
                <Link
                  href={`/shop/products/${product.slug}`}
                  className="font-semibold text-lg text-gray-900 hover:text-blue-600 transition-colors line-clamp-2 mb-1"
                >
                  {product.name}
                </Link>
                <div className="text-sm text-gray-500 mb-2">SKU: {product.sku}</div>
                <div className="inline-block px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
                  {brandLabel}
                </div>
              </div>

              <div className="text-right shrink-0">
                <div className="text-2xl font-bold text-gray-900">
                  {product.price.toLocaleString()}
                </div>
                <div className="text-xs text-gray-500">{product.currency ?? "VND"}</div>
              </div>
            </div>

            {rating > 0 && (
              <div className="flex items-center gap-2 mb-2">
                <StarRating value={rating} size={14} />
                <span className="text-sm font-medium text-gray-700">
                  {rating.toFixed(1)}
                  <span className="text-gray-400 font-normal"> ({ratingCount})</span>
                </span>
              </div>
            )}

            {product.description && (
              <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                {product.description}
              </p>
            )}

            <div className="flex items-center justify-between mt-auto pt-3 border-t border-gray-100">
              <div className="flex items-center gap-4 text-sm text-gray-500">
                {purchases > 0 && (
                  <div className="flex items-center gap-1.5">
                    <TrendingUp className="h-4 w-4" />
                    <span>{purchases.toLocaleString()} đã bán</span>
                  </div>
                )}
                {product.inStock ? (
                  <div className="flex items-center gap-1.5 text-green-600">
                    <Package className="h-4 w-4" />
                    <span>Còn hàng</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-red-600">
                    <Package className="h-4 w-4" />
                    <span>Hết hàng</span>
                  </div>
                )}
              </div>

              <AddToCartButton sku={product.sku} name={product.name} image={product.image} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="group rounded-2xl border border-gray-200 bg-white overflow-hidden flex flex-col hover:shadow-xl hover:border-blue-300 transition-all duration-300">
      <Link
        href={`/shop/products/${product.slug}`}
        className="relative block aspect-square bg-gray-50 overflow-hidden"
      >
        <Image
          src={product.image || "/logo.png"}
          alt={product.name}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-500"
        />
        {!product.inStock && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <span className="bg-white text-gray-900 px-4 py-2 rounded-full text-sm font-semibold">
              Hết hàng
            </span>
          </div>
        )}
        {rating > 0 && (
          <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-sm px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 shadow-lg">
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
            <span className="text-xs font-semibold text-gray-900">{rating.toFixed(1)}</span>
          </div>
        )}
      </Link>

      <div className="p-4 flex-1 flex flex-col gap-2">
        <div className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-md inline-block self-start">
          {brandLabel}
        </div>

        <Link
          href={`/shop/products/${product.slug}`}
          className="font-semibold text-gray-900 line-clamp-2 hover:text-blue-600 transition-colors leading-snug min-h-10"
          title={product.name}
        >
          {product.name}
        </Link>

        {rating > 0 && (
          <div className="flex items-center gap-2">
            <StarRating value={rating} size={12} />
            <span className="text-xs text-gray-500">({ratingCount})</span>
          </div>
        )}

        {purchases > 0 && (
          <div className="text-xs text-gray-500 flex items-center gap-1.5">
            <TrendingUp className="h-3.5 w-3.5" />
            {purchases.toLocaleString()} đã bán
          </div>
        )}

        <div className="mt-auto pt-3 flex items-center justify-between border-t border-gray-100">
          <div className="flex flex-col">
            <span className="text-lg font-bold text-gray-900">
              {product.price.toLocaleString()}
            </span>
            <span className="text-xs text-gray-500">{product.currency ?? "VND"}</span>
          </div>
          <AddToCartButton sku={product.sku} name={product.name} image={product.image} />
        </div>
      </div>
    </div>
  );
}

// Smart SearchBar Component
function SmartSearchBar({ onSearch }: { onSearch: (query: string) => void }) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);

  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Load search history
  useEffect(() => {
    try {
      const history = localStorage.getItem(SEARCH_HISTORY_KEY);
      if (history) {
        setSearchHistory(JSON.parse(history));
      }
    } catch (e) {
      console.error("Failed to load search history:", e);
    }
  }, []);

  // Save search to history
  const saveToHistory = (searchQuery: string) => {
    const trimmed = searchQuery.trim();
    if (!trimmed || trimmed.length < 2) return;

    try {
      const newHistory = [
        trimmed,
        ...searchHistory.filter((h) => h !== trimmed),
      ].slice(0, MAX_HISTORY);

      setSearchHistory(newHistory);
      localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(newHistory));
    } catch (e) {
      console.error("Failed to save search history:", e);
    }
  };

  // Fetch suggestions
  useEffect(() => {
    if (!query || query.length < 2) {
      if (searchHistory.length > 0) {
        setSuggestions(
          searchHistory.map((h) => ({
            type: "history",
            text: h,
            icon: "clock",
            url: `/shop/products?q=${encodeURIComponent(h)}`,
          }))
        );
      } else {
        setSuggestions([]);
      }
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/search/autocomplete?q=${encodeURIComponent(query)}&limit=10`
        );
        const data = await res.json();

        if (data.success) {
          setSuggestions(data.data.suggestions || []);
        }
      } catch (error) {
        console.error("Autocomplete error:", error);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, searchHistory]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case "Enter":
        e.preventDefault();
        if (selectedIndex >= 0 && suggestions[selectedIndex]) {
          handleSelectSuggestion(suggestions[selectedIndex]);
        } else {
          handleSearch();
        }
        break;
      case "Escape":
        setShowSuggestions(false);
        break;
    }
  };

  // Handle search
  const handleSearch = () => {
    if (!query.trim()) return;

    saveToHistory(query);
    setShowSuggestions(false);
    onSearch(query);
  };

  // Handle suggestion selection
  const handleSelectSuggestion = (suggestion: Suggestion) => {
    if (suggestion.type === "search" || suggestion.type === "history") {
      saveToHistory(suggestion.text);
    }

    setShowSuggestions(false);
    setQuery(suggestion.text);

    if (suggestion.url) {
      router.push(suggestion.url);
    }
  };

  // Clear search
  const handleClear = () => {
    setQuery("");
    setSuggestions([]);
    setSelectedIndex(-1);
    inputRef.current?.focus();
  };

  // Clear history
  const clearHistory = () => {
    setSearchHistory([]);
    localStorage.removeItem(SEARCH_HISTORY_KEY);
    setSuggestions([]);
  };

  // Get icon component
  const getIcon = (iconName?: string) => {
    const iconProps = { className: "h-4 w-4" };
    switch (iconName) {
      case "trending":
        return <TrendingUp {...iconProps} />;
      case "package":
        return <Package {...iconProps} />;
      case "award":
        return <Award {...iconProps} />;
      case "grid":
        return <GridIcon {...iconProps} />;
      case "clock":
        return <Clock {...iconProps} />;
      default:
        return <Search {...iconProps} />;
    }
  };

  return (
    <div className="relative">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none z-10" />
        
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setShowSuggestions(true)}
          onKeyDown={handleKeyDown}
          placeholder="Tìm kiếm sản phẩm, thương hiệu, danh mục..."
          className="w-full pl-12 pr-12 py-3.5 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none transition-all text-sm bg-white"
        />

        {/* Loading or Clear button */}
        <div className="absolute right-4 top-1/2 -translate-y-1/2 z-10">
          {loading ? (
            <Loader2 className="h-5 w-5 text-gray-400 animate-spin" />
          ) : query ? (
            <button
              onClick={handleClear}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              type="button"
            >
              <X className="h-5 w-5" />
            </button>
          ) : null}
        </div>
      </div>

      {/* Suggestions Dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl border-2 border-gray-200 shadow-2xl z-50 overflow-hidden"
        >
          <div className="max-h-96 overflow-y-auto">
            {/* History header */}
            {suggestions[0]?.type === "history" && (
              <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-200">
                <span className="text-xs font-medium text-gray-500">
                  Tìm kiếm gần đây
                </span>
                <button
                  onClick={clearHistory}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                >
                  Xóa
                </button>
              </div>
            )}

            {/* Suggestions list */}
            {suggestions.map((suggestion, index) => (
              <button
                key={`${suggestion.type}-${index}`}
                onClick={() => handleSelectSuggestion(suggestion)}
                className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left ${
                  index === selectedIndex ? "bg-blue-50" : ""
                }`}
                type="button"
              >
                {/* Icon or Image */}
                <div className="shrink-0 w-8 h-8 flex items-center justify-center">
                  {suggestion.image ? (
                    <Image
                      src={suggestion.image}
                      alt=""
                      width={32}
                      height={32}
                      className="object-cover rounded"
                    />
                  ) : (
                    <div className="text-gray-400">
                      {getIcon(suggestion.icon)}
                    </div>
                  )}
                </div>

                {/* Text */}
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 truncate">
                    {suggestion.text}
                  </div>
                  {suggestion.subtext && (
                    <div className="text-xs text-gray-500 truncate">
                      {suggestion.subtext}
                    </div>
                  )}
                </div>

                {/* Type badge */}
                {suggestion.type !== "search" &&
                  suggestion.type !== "history" && (
                    <div className="shrink-0">
                      <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600">
                        {suggestion.type === "product"
                          ? "Sản phẩm"
                          : suggestion.type === "brand"
                          ? "Thương hiệu"
                          : "Danh mục"}
                      </span>
                    </div>
                  )}
              </button>
            ))}
          </div>

          {/* Footer hint */}
          <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 text-xs text-gray-500 flex items-center justify-between">
            <span>Sử dụng ↑ ↓ để điều hướng, Enter để chọn</span>
            <span className="text-gray-400">ESC để đóng</span>
          </div>
        </div>
      )}
    </div>
  );
}

// Main Component
export default function ProductsSearchClient() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [q, setQ] = useState(searchParams.get("q") || "");
  const [brand, setBrand] = useState(searchParams.get("brand") || "");
  const [category, setCategory] = useState(searchParams.get("category") || "");
  const [productType, setProductType] = useState(searchParams.get("type") || "");
  const [minPrice, setMinPrice] = useState(searchParams.get("minPrice") || "");
  const [maxPrice, setMaxPrice] = useState(searchParams.get("maxPrice") || "");
  const [inStock, setInStock] = useState(searchParams.get("inStock") === "true");
  const [sort, setSort] = useState(searchParams.get("sort") || "relevance");
  const [page, setPage] = useState(parseInt(searchParams.get("page") || "1"));
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showFilters, setShowFilters] = useState(false);
  const pageSize = 12;

  const dq = useDebounced(q);

  const [items, setItems] = useState<ProductCard[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [brands, setBrands] = useState<BrandOpt[]>([]);
  const [categories, setCategories] = useState<CategoryOpt[]>([]);
  const [productTypes, setProductTypes] = useState<ProductTypeOpt[]>([]);

  const syncFiltersToUrl = useCallback(
    (overrides: Partial<FiltersState> = {}, options: { method?: "push" | "replace" } = {}) => {
      const state: FiltersState = {
        q,
        brand,
        category,
        productType,
        minPrice,
        maxPrice,
        inStock,
        sort,
        page,
        ...overrides,
      };

      const params = new URLSearchParams();
      if (state.q) params.set("q", state.q);
      if (state.brand) params.set("brand", state.brand);
      if (state.category) params.set("category", state.category);
      if (state.productType) params.set("type", state.productType);
      if (state.minPrice) params.set("minPrice", state.minPrice);
      if (state.maxPrice) params.set("maxPrice", state.maxPrice);
      if (state.inStock) params.set("inStock", "true");
      if (state.sort && state.sort !== "relevance") params.set("sort", state.sort);

      const normalizedPage = Math.max(1, Number(state.page) || 1);
      if (normalizedPage > 1) {
        params.set("page", String(normalizedPage));
      }

      const query = params.toString();
      const nextUrl = query ? `/shop/products?${query}` : "/shop/products";
      const method = options.method === "push" ? "push" : "replace";
      router[method](nextUrl, { scroll: false });
    },
    [router, q, brand, category, productType, minPrice, maxPrice, inStock, sort, page]
  );

  // Fetch brands and categories
  useEffect(() => {
    Promise.all([
      fetch("/api/brands").then((r) => r.json()),
      fetch("/api/categories").then((r) => r.json()),
    ])
      .then(([brandsData, categoriesData]) => {
        if (brandsData?.success && brandsData?.data) {
          setBrands(brandsData.data);
        }
        if (categoriesData?.success && categoriesData?.data) {
          setCategories(categoriesData.data);
        }
      })
      .catch((err) => {
        console.error("Error fetching filters:", err);
      });
  }, []);

  // Fetch product types, optionally filtered by category
  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams();
    if (category) params.set("category", category);
    const query = params.toString();

    fetch(`/api/product-types${query ? `?${query}` : ""}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((json) => {
        if (json?.success && Array.isArray(json.data)) {
          setProductTypes(json.data);
        } else {
          console.warn("Unexpected product type response", json);
          setProductTypes([]);
        }
      })
      .catch((err) => {
        if (err?.name === "AbortError") return;
        console.error("Error fetching product types:", err);
        setProductTypes([]);
      });

    return () => controller.abort();
  }, [category]);

  // Fetch products
  useEffect(() => {
    const url = new URL("/api/products", window.location.origin);
    url.searchParams.set("page", String(page));
    url.searchParams.set("pageSize", String(pageSize));
    if (dq) url.searchParams.set("q", dq);
    if (brand) url.searchParams.set("brand", brand);
    if (category) url.searchParams.set("category", category);
    if (productType) url.searchParams.set("type", productType);
    if (minPrice) url.searchParams.set("minPrice", minPrice);
    if (maxPrice) url.searchParams.set("maxPrice", maxPrice);
    if (inStock) url.searchParams.set("inStock", "true");
    if (sort) url.searchParams.set("sort", sort);

    setLoading(true);
    fetch(url.toString())
      .then((r) => r.json())
      .then((json) => {
        if (json?.success) {
          setItems(json.data || []);
          setTotal(json.meta?.total ?? 0);
        } else {
          setItems([]);
          setTotal(0);
        }
      })
      .catch(() => {
        setItems([]);
        setTotal(0);
      })
      .finally(() => setLoading(false));
  }, [dq, brand, category, productType, minPrice, maxPrice, inStock, sort, page]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total]);

  function resetFilters() {
    setQ("");
    setBrand("");
    setCategory("");
    setProductType("");
    setMinPrice("");
    setMaxPrice("");
    setInStock(false);
    setSort("relevance");
    setPage(1);
    router.replace("/shop/products");
  }

  const hasActiveFilters =
    q || brand || category || productType || minPrice || maxPrice || inStock || sort !== "relevance";

  // Handle smart search
  const handleSearch = (searchQuery: string) => {
    setQ(searchQuery);
    setPage(1);
    syncFiltersToUrl({ q: searchQuery, page: 1 }, { method: "push" });
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-50 to-blue-50/30">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Header
        <div className="mb-6 sm:mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
            Sản phẩm công nghiệp
          </h1>
          <p className="text-gray-600">
            Khám phá hàng ngàn sản phẩm chất lượng cao cho doanh nghiệp của bạn
          </p>
        </div> */}

        {/* Smart Search Bar */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 mb-4">
          <SmartSearchBar onSearch={handleSearch} />
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar Filters - Desktop */}
          <aside className="hidden lg:block w-64 shrink-0">
            <div className="bg-white rounded-2xl border border-gray-200 p-5 sticky top-6">
              <div className="flex items-center gap-2 mb-4">
                <SlidersHorizontal className="h-5 w-5 text-gray-700" />
                <h3 className="font-semibold text-gray-900">Bộ lọc</h3>
              </div>

              <div className="space-y-4">
                {/* Brand Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Thương hiệu
                  </label>
                  <select
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-50 outline-none text-sm"
                    value={brand}
                    onChange={(e) => {
                      const value = e.target.value;
                      setBrand(value);
                      setPage(1);
                      syncFiltersToUrl({ brand: value, page: 1 });
                    }}
                  >
                    <option value="">Tất cả</option>
                    {brands.map((b) => (
                      <option key={b.slug} value={b.slug}>
                        {b.name} {b.productCount ? `(${b.productCount})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Category Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Danh mục
                  </label>
                  <select
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-50 outline-none text-sm"
                    value={category}
                    onChange={(e) => {
                      const value = e.target.value;
                      setCategory(value);
                      setProductType("");
                      setPage(1);
                      syncFiltersToUrl({ category: value, productType: "", page: 1 });
                    }}
                  >
                    <option value="">Tất cả</option>
                    {categories.map((c) => (
                      <option key={c.slug} value={c.slug}>
                        {c.name} {c.productCount ? `(${c.productCount})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Product Type Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Loại sản phẩm
                  </label>
                  <select
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-50 outline-none text-sm"
                    value={productType}
                    onChange={(e) => {
                      const value = e.target.value;
                      setProductType(value);
                      setPage(1);
                      syncFiltersToUrl({ productType: value, page: 1 });
                    }}
                  >
                    <option value="">Tất cả</option>
                    {productTypes.map((t) => (
                      <option key={t.slug} value={t.slug}>
                        {`${t.name}${t.category?.name ? ` - ${t.category.name}` : ""}${
                          t.productCount ? ` (${t.productCount})` : ""
                        }`}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Price Range */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Khoảng giá
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      placeholder="Từ"
                      value={minPrice}
                      onChange={(e) => {
                        const value = e.target.value;
                        setMinPrice(value);
                        setPage(1);
                        syncFiltersToUrl({ minPrice: value, page: 1 });
                      }}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-50 outline-none text-sm"
                    />
                    <input
                      type="number"
                      placeholder="Đến"
                      value={maxPrice}
                      onChange={(e) => {
                        const value = e.target.value;
                        setMaxPrice(value);
                        setPage(1);
                        syncFiltersToUrl({ maxPrice: value, page: 1 });
                      }}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-50 outline-none text-sm"
                    />
                  </div>
                </div>

                {/* Stock Filter */}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={inStock}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setInStock(checked);
                      setPage(1);
                      syncFiltersToUrl({ inStock: checked, page: 1 });
                    }}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Chỉ sản phẩm còn hàng</span>
                </label>

                {hasActiveFilters && (
                  <button
                    onClick={resetFilters}
                    className="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    <X className="h-4 w-4" />
                    Xóa bộ lọc
                  </button>
                )}
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {/* Toolbar */}
            <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4 w-full sm:w-auto">
                  {/* Mobile Filter Toggle */}
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className="lg:hidden flex items-center gap-2 px-4 py-2 border-2 border-gray-200 rounded-xl hover:bg-gray-50 text-sm font-medium"
                  >
                    <Filter className="h-4 w-4" />
                    Bộ lọc
                  </button>

                  {/* Sort */}
                  <select
                    className="flex-1 sm:flex-initial px-4 py-2 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-50 outline-none text-sm"
                    value={sort}
                    onChange={(e) => {
                      const value = e.target.value;
                      setSort(value);
                      setPage(1);
                      syncFiltersToUrl({ sort: value, page: 1 });
                    }}
                  >
                    <option value="relevance">Liên quan</option>
                    <option value="price_asc">Giá tăng</option>
                    <option value="price_desc">Giá giảm</option>
                    <option value="name_asc">A-Z</option>
                    <option value="name_desc">Z-A</option>
                    <option value="popular">Bán chạy</option>
                    <option value="rating">Đánh giá cao</option>
                  </select>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                  <div className="text-sm text-gray-600">
                    {loading ? "Đang tải..." : `${total.toLocaleString()} sản phẩm`}
                  </div>

                  {/* View Mode */}
                  <div className="flex gap-1 p-1 bg-gray-100 rounded-lg">
                    <button
                      onClick={() => setViewMode("grid")}
                      className={`p-2 rounded transition-colors ${
                        viewMode === "grid"
                          ? "bg-white shadow-sm text-blue-600"
                          : "text-gray-500 hover:text-gray-700"
                      }`}
                    >
                      <Grid3x3 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setViewMode("list")}
                      className={`p-2 rounded transition-colors ${
                        viewMode === "list"
                          ? "bg-white shadow-sm text-blue-600"
                          : "text-gray-500 hover:text-gray-700"
                      }`}
                    >
                      <List className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Mobile Filters */}
              {showFilters && (
                <div className="lg:hidden mt-4 pt-4 border-t border-gray-200 space-y-3">
                  <select
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
                    value={brand}
                    onChange={(e) => {
                      const value = e.target.value;
                      setBrand(value);
                      setPage(1);
                      syncFiltersToUrl({ brand: value, page: 1 });
                    }}
                  >
                    <option value="">Tất cả thương hiệu</option>
                    {brands.map((b) => (
                      <option key={b.slug} value={b.slug}>
                        {b.name}
                      </option>
                    ))}
                  </select>

                  <select
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
                    value={category}
                    onChange={(e) => {
                      const value = e.target.value;
                      setCategory(value);
                      setProductType("");
                      setPage(1);
                      syncFiltersToUrl({ category: value, productType: "", page: 1 });
                    }}
                  >
                    <option value="">Tất cả danh mục</option>
                    {categories.map((c) => (
                      <option key={c.slug} value={c.slug}>
                        {c.name}
                      </option>
                    ))}
                  </select>

                  <select
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
                    value={productType}
                    onChange={(e) => {
                      const value = e.target.value;
                      setProductType(value);
                      setPage(1);
                      syncFiltersToUrl({ productType: value, page: 1 });
                    }}
                  >
                    <option value="">Tất cả loại sản phẩm</option>
                    {productTypes.map((t) => (
                      <option key={t.slug} value={t.slug}>
                        {`${t.name}${t.category?.name ? ` - ${t.category.name}` : ""}`}
                      </option>
                    ))}
                  </select>

                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={inStock}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setInStock(checked);
                        setPage(1);
                        syncFiltersToUrl({ inStock: checked, page: 1 });
                      }}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span className="text-sm">Còn hàng</span>
                  </label>
                </div>
              )}
            </div>

            {/* Products Grid/List */}
            <div
              className={
                viewMode === "grid"
                  ? "grid gap-4 grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                  : "space-y-4"
              }
            >
              {loading
                ? Array.from({ length: pageSize }).map((_, i) => (
                    <div key={i} className="animate-pulse rounded-2xl border bg-white overflow-hidden">
                      <div className="aspect-square bg-gray-100" />
                      <div className="p-4 space-y-3">
                        <div className="h-4 bg-gray-100 rounded" />
                        <div className="h-4 w-2/3 bg-gray-100 rounded" />
                      </div>
                    </div>
                  ))
                : items.map((p) => <ProductCard key={p.slug} product={p} viewMode={viewMode} />)}
            </div>

            {/* Empty State */}
            {!loading && items.length === 0 && (
              <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
                <Search className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Không tìm thấy sản phẩm
                </h3>
                <p className="text-gray-600 mb-6">
                  Thử điều chỉnh bộ lọc hoặc từ khóa tìm kiếm
                </p>
                {hasActiveFilters && (
                  <button
                    onClick={resetFilters}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-medium"
                  >
                    <X className="h-4 w-4" />
                    Xóa bộ lọc
                  </button>
                )}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && !loading && (
              <div className="mt-8 flex items-center justify-center gap-2">
                <button
                  onClick={() => {
                    if (page <= 1) return;
                    const nextPage = Math.max(1, page - 1);
                    setPage(nextPage);
                    syncFiltersToUrl({ page: nextPage });
                  }}
                  disabled={page <= 1}
                  className="p-2 rounded-xl border-2 border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition-colors"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>

                <div className="flex items-center gap-2">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
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
                        onClick={() => {
                          if (page === pageNum) return;
                          setPage(pageNum);
                          syncFiltersToUrl({ page: pageNum });
                        }}
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
                  onClick={() => {
                    if (page >= totalPages) return;
                    const nextPage = Math.min(totalPages, page + 1);
                    setPage(nextPage);
                    syncFiltersToUrl({ page: nextPage });
                  }}
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
