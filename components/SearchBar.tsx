"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  X,
  TrendingUp,
  Package,
  Award,
  Grid,
  Clock,
  Loader2,
} from "lucide-react";
import Image from "next/image";

type Suggestion = {
  type: "product" | "brand" | "category" | "search" | "popular" | "history";
  text: string;
  subtext?: string;
  url?: string;
  image?: string | null;
  icon?: string;
};

type SearchBarProps = {
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
  onSearch?: (query: string) => void;
};

const SEARCH_HISTORY_KEY = "search_history";
const MAX_HISTORY = 5;

export default function SearchBar({
  placeholder = "Tìm kiếm sản phẩm, thương hiệu...",
  className = "",
  autoFocus = false,
  onSearch,
}: SearchBarProps) {
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
      // Show history when empty
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

    if (onSearch) {
      onSearch(query);
    } else {
      router.push(`/shop/products?q=${encodeURIComponent(query)}`);
    }
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
        return <Grid {...iconProps} />;
      case "clock":
        return <Clock {...iconProps} />;
      default:
        return <Search {...iconProps} />;
    }
  };

  return (
    <div className={`relative ${className}`}>
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
        
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setShowSuggestions(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className="w-full pl-12 pr-12 py-3.5 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none transition-all text-sm bg-white"
        />

        {/* Loading or Clear button */}
        <div className="absolute right-4 top-1/2 -translate-y-1/2">
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