"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, type ComponentType, type CSSProperties } from "react";
import {
  Settings,
  Wrench,
  Clock,
  Award,
  Phone,
  ArrowRight,
  Package,
  Headphones,
  BadgeCheck,
  Factory,
  Laptop,
  TrendingUp,
  Star,
  Sparkles,
} from "lucide-react";
import QuoteRequestButton from "@/app/shop/products/QuoteRequestButton";

type HeroSlide = {
  image: string;
  title?: string | null;
  subtitle?: string | null;
  ctaLabel?: string | null;
  ctaHref?: string | null;
   textPosition?:
    | "TOP_LEFT"
    | "TOP_RIGHT"
    | "MIDDLE_LEFT"
    | "MIDDLE_RIGHT"
    | "BOTTOM_LEFT"
    | "BOTTOM_RIGHT";
  overlayOn?: boolean | null;
  overlayColor?: string | null;
};

const FALLBACK_IMAGE = "/logo.png";

type HeroBannerResponse = {
  data?: Array<{
    imageUrl: string;
    title?: string | null;
    content?: string | null;
    ctaLabel?: string | null;
    ctaHref?: string | null;
    textPosition?:
      | "TOP_LEFT"
      | "TOP_RIGHT"
      | "MIDDLE_LEFT"
      | "MIDDLE_RIGHT"
      | "BOTTOM_LEFT"
      | "BOTTOM_RIGHT";
    overlayOn?: boolean | null;
    overlayColor?: string | null;
  }>;
};

type FeaturedProductResponse = {
  data?: Array<{
    id?: string | number;
    title?: string | null;
    product?: ApiProduct | null;
  }>;
};

type ProductListResponse = {
  data?: ApiProduct[];
};

type HomeProduct = {
  id: string;
  slug?: string | null;
  name: string;
  image: string;
  brand?: string | null;
  price: number | null;
  listPrice?: number | null;
  rating?: number | null;
  sales?: number | null;
  requiresQuote?: boolean;
};

type ApiProduct = {
  id?: string | number | null;
  slug?: string | null;
  name?: string | null;
  coverImage?: string | null;
  image?: string | null;
  brand?: { name?: string | null } | null;
  brandName?: string | null;
  price?: number | string | null;
  listPrice?: number | string | null;
  ratingAvg?: number | string | null;
  rating?: number | string | null;
  purchaseCount?: number | string | null;
  sales?: number | string | null;
  requiresQuote?: boolean | null;
};

type MarqueeStyle = CSSProperties & { "--marquee-duration"?: string };

function normalizeProductData(
  source: ApiProduct | null | undefined,
  options: { fallbackName?: string; fallbackId?: string } = {},
): HomeProduct {
  const product = source ?? {};
  const price = product.price != null ? Number(product.price) : null;
  const listPrice = product.listPrice != null ? Number(product.listPrice) : null;
  const id =
    (product.id && String(product.id)) ||
    options.fallbackId ||
    product.slug ||
    product.name ||
    options.fallbackName ||
    "product";

  return {
    id,
    slug: product.slug ?? null,
    name: product.name ?? options.fallbackName ?? "Sản phẩm",
    image: product.coverImage || product.image || FALLBACK_IMAGE,
    brand: product.brand?.name ?? product.brandName ?? null,
    price,
    listPrice,
    rating:
      product.ratingAvg != null
        ? Number(product.ratingAvg)
        : product.rating != null
        ? Number(product.rating)
        : null,
    sales:
      product.purchaseCount != null
        ? Number(product.purchaseCount)
        : product.sales != null
        ? Number(product.sales)
        : null,
    requiresQuote: Boolean(product.requiresQuote),
  };
}

// Product Card Component
function ProductCard({ product, index }: { product: HomeProduct; index: number }) {
  const price = product.price ?? 0;
  const listPrice = product.listPrice ?? null;
  const isQuoteOnly = Boolean(product.requiresQuote);
  const hasDiscount = !isQuoteOnly && listPrice !== null && listPrice > price;
  const discount = hasDiscount ? Math.round(((listPrice - price) / listPrice) * 100) : 0;
  const priceLabel =
    isQuoteOnly || product.price === null
      ? "Liên hệ báo giá"
      : `${price.toLocaleString("vi-VN")}₫`;

  return (
    <div
      data-product-card
      className="animate-slide-up group bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-2xl transition-all duration-300 flex flex-col h-full"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <Link href={product.slug ? `/shop/products/${product.slug}` : "/shop/products"} className="relative aspect-square overflow-hidden bg-gray-100">
        <Image
          src={product.image || FALLBACK_IMAGE}
          alt={product.name}
          fill
          className="object-cover group-hover:scale-110 transition-transform duration-500"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
        />
        {hasDiscount && (
          <div className="absolute top-3 left-3 bg-red-500 text-white px-3 py-1 rounded-full text-xs font-bold animate-pulse">
            -{discount}%
          </div>
        )}
      </Link>

      <div className="p-4 flex-1 flex flex-col">
        <div className="text-xs text-gray-500 font-medium mb-1">{product.brand ?? "AHSO"}</div>
        <Link
          href={product.slug ? `/shop/products/${product.slug}` : "/shop/products"}
          className="font-semibold text-gray-900 mb-2 line-clamp-2 flex-1"
        >
          {product.name}
        </Link>

        <div className="flex items-center gap-2 mb-3">
          <div className="flex items-center gap-1">
            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
            <span className="text-sm font-medium">
              {product.rating && product.rating > 0 ? product.rating.toFixed(1) : "—"}
            </span>
          </div>
          {product.sales != null && (
            <span className="text-xs text-gray-400">
              ({product.sales.toLocaleString("vi-VN")} đã bán)
            </span>
          )}
        </div>

        {isQuoteOnly ? (
          <div className="mt-auto flex items-center justify-between">
            <QuoteRequestButton
              productId={product.id}
              productName={product.name}
              productSlug={product.slug ?? undefined}
              className="inline-flex items-center rounded-full bg-amber-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-amber-700"
            />
            <Link
              href={product.slug ? `/shop/products/${product.slug}` : "/shop/products"}
              className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center hover:bg-blue-200 transition-colors shadow-lg hover:shadow-xl hover:scale-110"
            >
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        ) : (
          <div className="mt-auto flex items-end justify-between">
            <div>
              <div className="text-xl font-bold text-blue-600">{priceLabel}</div>
              {hasDiscount && (
                <div className="text-sm text-gray-400 line-through">
                  {listPrice?.toLocaleString("vi-VN")}₫
                </div>
              )}
            </div>
            <Link
              href={product.slug ? `/shop/products/${product.slug}` : "/shop/products"}
              className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center hover:bg-blue-700 transition-colors shadow-lg hover:shadow-xl hover:scale-110"
            >
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

type SectionHeaderProps = {
  icon: ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
};

function SectionHeader({ icon: Icon, title, subtitle }: SectionHeaderProps) {
  return (
    <div className="text-center mb-12 animate-fade-in-up">
      <div className="inline-flex items-center justify-center w-16 h-16 bg-linear-to-br from-blue-500 to-blue-600 rounded-2xl mb-4 shadow-lg">
        <Icon className="w-8 h-8 text-white" />
      </div>
      <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">{title}</h2>
      <p className="text-gray-600 max-w-2xl mx-auto">{subtitle}</p>
    </div>
  );
}

function HomePageLoading() {
  return (
    <div className="min-h-screen bg-white">
      <div className="min-h-screen flex flex-col items-center justify-center gap-6">
        <div className="relative w-28 h-28">
          <div className="absolute inset-0 rounded-full border-4 border-blue-500 border-t-transparent animate-spin" />
          <div className="absolute inset-2 rounded-full bg-white shadow-md flex items-center justify-center">
            <Image src={FALLBACK_IMAGE} alt="AHSO" width={64} height={64} />
          </div>
        </div>
        <div className="text-sm text-gray-500">Đang tải dữ liệu trang chủ...</div>
      </div>
    </div>
  );
}

export default function HomePageClient() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [heroSlides, setHeroSlides] = useState<HeroSlide[] | null>(null);
  const [featuredProducts, setFeaturedProducts] = useState<HomeProduct[]>([]);
  const [bestSellers, setBestSellers] = useState<HomeProduct[]>([]);
  const [newArrivals, setNewArrivals] = useState<HomeProduct[]>([]);
  const [topRated, setTopRated] = useState<HomeProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [heroAnimated, setHeroAnimated] = useState(false);
  const [heroAnimationDone, setHeroAnimationDone] = useState(false);

  // Auto-rotate slides
  useEffect(() => {
    const total = heroSlides?.length ?? 0;
    if (total <= 1) return;
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % total);
    }, 5000);
    return () => clearInterval(interval);
  }, [heroSlides?.length]);

  // Fetch hero banners + highlighted product lists
  useEffect(() => {
    let ignore = false;
    const fetchData = async () => {
      try {
        const res = await fetch("/api/home-feed");
        if (!res.ok) throw new Error("home-feed error");
        const json = await res.json().catch(() => ({}));
        if (ignore) return;

        const heroData: HeroBannerResponse["data"] = json?.data?.hero ?? [];
        const featuredData: FeaturedProductResponse["data"] = json?.data?.featured ?? [];
        const bestData: ProductListResponse["data"] = json?.data?.bestSellers ?? [];
        const newData: ProductListResponse["data"] = json?.data?.newArrivals ?? [];
        const topData: ProductListResponse["data"] = json?.data?.topRated ?? [];

        setHeroSlides(
          Array.isArray(heroData)
            ? heroData.map((item) => ({
                image: item.imageUrl,
                title: item.title,
                subtitle: item.content,
                ctaLabel: item.ctaLabel,
                ctaHref: item.ctaHref,
                textPosition: item.textPosition,
                overlayOn: item.overlayOn,
                overlayColor: item.overlayColor,
              }))
            : [],
        );

        setFeaturedProducts(
          Array.isArray(featuredData)
            ? featuredData.map((item) =>
                normalizeProductData(item.product ?? null, {
                  fallbackName: item.title ?? undefined,
                  fallbackId: item.id?.toString(),
                }),
              )
            : [],
        );
        setBestSellers(
          Array.isArray(bestData) ? bestData.map((item) => normalizeProductData(item)) : [],
        );
        setNewArrivals(
          Array.isArray(newData) ? newData.map((item) => normalizeProductData(item)) : [],
        );
        setTopRated(
          Array.isArray(topData) ? topData.map((item) => normalizeProductData(item)) : [],
        );
      } catch (error) {
        console.error("Failed to load homepage data:", error);
        if (!ignore) {
          setHeroSlides([]);
          setFeaturedProducts([]);
          setBestSellers([]);
          setNewArrivals([]);
          setTopRated([]);
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    };
    fetchData();
    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    if (!isLoading && !heroAnimated) {
      setHeroAnimated(true);
    }
  }, [isLoading, heroAnimated]);

  // Intersection Observer for scroll animations
  useEffect(() => {
    if (isLoading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("animate-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -50px 0px" }
    );

    const elements = document.querySelectorAll(".animate-on-scroll");
    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [isLoading]);

  const resolvedSlides = heroSlides ?? [];
  const totalSlides = Math.max(1, resolvedSlides.length);
  const hasSlides = resolvedSlides.length > 0;
  const activeSlide = hasSlides ? resolvedSlides[currentSlide % totalSlides] : null;
  const displayTitle = activeSlide?.title || "";
  const displaySubtitle = activeSlide?.subtitle || "";
  const displayCtaLabel = activeSlide?.ctaLabel ?? null;
  const displayCtaHref = activeSlide?.ctaHref ?? null;
  const hasContent = Boolean(displayTitle || displaySubtitle);
  const positionClass = (() => {
    switch (activeSlide?.textPosition) {
      case "TOP_RIGHT":
        return "items-start justify-end";
      case "MIDDLE_LEFT":
        return "items-center justify-start";
      case "MIDDLE_RIGHT":
        return "items-center justify-end";
      case "BOTTOM_LEFT":
        return "items-end justify-start";
      case "BOTTOM_RIGHT":
        return "items-end justify-end";
      case "TOP_LEFT":
      default:
        return "items-start justify-start";
    }
  })();
  const normalizeOverlayColor = (value?: string | null) => {
    const fallback = "rgba(15,23,42,0.18)";
    if (!value) return fallback;
    if (/rgba?\(/i.test(value) || /hsla?\(/i.test(value)) return value;
    if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(value)) {
      let hex = value.replace("#", "");
      if (hex.length === 3) {
        hex = hex.split("").map((ch) => ch + ch).join("");
      }
      const hasAlpha = hex.length === 8;
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      const a = hasAlpha ? parseInt(hex.slice(6, 8), 16) / 255 : 0.18;
      return `rgba(${r}, ${g}, ${b}, ${a})`;
    }
    return fallback;
  };

  // Semi-transparent “veil” so the banner stays visible, even if user picked white
  const getOverlayColor = (value?: string | null) => normalizeOverlayColor(value);

  const categories = [
    {
      name: "Giải pháp Công nghiệp",
      href: "/shop/solutions",
      icon: Factory,
      image: "/factory1.jpg",
      gradient: "from-blue-600 to-cyan-500",
    },
    {
      name: "Phần mềm & Dịch vụ",
      href: "/shop/software",
      icon: Laptop,
      image: "/factory2.jpg",
      gradient: "from-purple-600 to-pink-500",
    },
    {
      name: "Sản phẩm Công Nghiệp",
      href: "/shop/products",
      icon: Package,
      image: "/linhkien1.jpg",
      gradient: "from-green-600 to-emerald-500",
    },
  ];

  const features = [
    {
      icon: Settings,
      title: "Máy móc công nghiệp",
      description: "Máy móc hiện đại, hiệu suất cao",
      color: "from-blue-500 to-blue-600",
    },
    {
      icon: Wrench,
      title: "Phụ tùng chính hãng",
      description: "Linh kiện tương thích hoàn hảo",
      color: "from-purple-500 to-purple-600",
    },
    {
      icon: BadgeCheck,
      title: "Bảo hành toàn diện",
      description: "Cam kết chất lượng lâu dài",
      color: "from-green-500 to-green-600",
    },
    {
      icon: Clock,
      title: "Giao hàng nhanh",
      description: "Vận chuyển toàn quốc", 
      color: "from-orange-500 to-orange-600",
    },
    {
      icon: Headphones,
      title: "Tư vấn 24/7",
      description: "Hỗ trợ kỹ thuật chuyên nghiệp",
      color: "from-red-500 to-red-600",
    },
    {
      icon: Award,
      title: "Giá cạnh tranh",
      description: "Ưu đãi hấp dẫn mọi đơn hàng",
      color: "from-yellow-500 to-yellow-600",
    },
  ];

  const shouldAnimateHero = heroAnimated && !heroAnimationDone;

  if (isLoading) {
    return <HomePageLoading />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <style jsx global>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(40px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        .animate-fade-in-up {
          animation: fadeInUp 0.8s ease-out;
        }

        .animate-slide-up {
          opacity: 0;
          animation: slideUp 0.6s ease-out forwards;
        }

        .animate-on-scroll {
          opacity: 0;
          transform: translateY(30px);
          transition: all 0.8s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .animate-on-scroll.animate-visible {
          opacity: 1;
          transform: translateY(0);
        }

        @keyframes marqueeX {
          from {
            transform: translateX(0);
          }
          to {
            transform: translateX(-50%);
          }
        }

        .marquee {
          position: relative;
          overflow: hidden;
        }

        .marquee-track {
          display: flex;
          width: max-content;
          animation: marqueeX var(--marquee-duration, 28s) linear infinite;
          will-change: transform;
        }

        .marquee:hover .marquee-track {
          animation-play-state: paused;
        }

      .marquee::before,
      .marquee::after {
        content: "";
        position: absolute;
        top: 0;
        bottom: 0;
        width: 90px;
        z-index: 2;
        pointer-events: none;
      }

      .marquee::before {
        left: 0;
        background: linear-gradient(to right, rgba(255, 255, 255, 1), rgba(255, 255, 255, 0));
      }

      .marquee::after {
        right: 0;
        background: linear-gradient(to left, rgba(255, 255, 255, 1), rgba(255, 255, 255, 0));
      }

        @media (prefers-reduced-motion: reduce) {
          .marquee-track {
            animation: none !important;
            transform: none !important;
          }
        }
      `}</style>

      {/* Hero Section */}
      <section className="relative h-[500px] md:h-[600px] lg:h-[700px] overflow-hidden">
        {/* Background Slides */}
        <div className="absolute inset-0">
          {resolvedSlides.length === 0 ? (
            <div className="absolute inset-0 bg-linear-to-r from-blue-900 via-blue-800 to-blue-700" />
          ) : (
            resolvedSlides.map((slide, index) => {
              const overlayOn = Boolean(slide.overlayOn);
              const overlayColor = getOverlayColor(slide.overlayColor);
              return (
                <div
                  key={`${slide.image}-${index}`}
                  className="absolute inset-0 transition-opacity duration-1000"
                  style={{
                    opacity: currentSlide === index ? 1 : 0,
                    backgroundImage: `url(${slide.image})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }}
                >
                  {overlayOn && (
                    <div
                      className="absolute inset-0"
                      style={{ background: overlayColor }}
                    />
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Content Overlay - Only if has content */}
        {hasContent && (
          <div className="relative z-10 h-full">
            <div className={`h-full w-full px-4 sm:px-6 lg:px-8 flex ${positionClass}`}>
              <div className="max-w-3xl">
                {displayTitle && (
                  <h1
                    className={`text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight text-white ${
                      shouldAnimateHero ? "animate-fade-in-up" : ""
                    }`}
                    style={{ animationDelay: "0.1s" }}
                  >
                    {displayTitle}
                  </h1>
                )}

                {displaySubtitle && (
                  <p
                    className={`text-lg md:text-xl lg:text-2xl mb-8 text-blue-100 ${
                      shouldAnimateHero ? "animate-fade-in-up" : ""
                    }`}
                    style={{ animationDelay: "0.2s" }}
                  >
                    {displaySubtitle}
                  </p>
                )}

                <div
                  className={`flex flex-wrap gap-4 ${
                    shouldAnimateHero ? "animate-fade-in-up" : ""
                  }`}
                  style={{ animationDelay: "0.3s" }}
                  onAnimationEnd={() => {
                    if (shouldAnimateHero) {
                      setHeroAnimationDone(true);
                    }
                  }}
                >
                  <Link
                    href="/shop/products"
                    className="group px-6 md:px-8 py-3 md:py-4 bg-white text-blue-600 rounded-xl font-semibold shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 flex items-center gap-2"
                  >
                    Khám phá sản phẩm
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </Link>

                  <Link
                    href="/contact"
                    className="px-6 md:px-8 py-3 md:py-4 bg-white/10 backdrop-blur-sm text-white rounded-xl font-semibold border-2 border-white/30 hover:bg-white/20 hover:scale-105 transition-all duration-300 flex items-center gap-2"
                  >
                    Liên hệ tư vấn
                    <Phone className="w-5 h-5" />
                  </Link>

                  {displayCtaLabel && displayCtaHref && (
                    <Link
                      href={displayCtaHref}
                      className="px-6 md:px-8 py-3 md:py-4 bg-green-500 text-white rounded-xl font-semibold shadow hover:bg-green-600 hover:scale-105 transition-all duration-300"
                    >
                      {displayCtaLabel}
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Slide Indicators */}
        {resolvedSlides.length > 1 && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex gap-2">
            {resolvedSlides.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSlide(index)}
                className={`h-2 rounded-full transition-all ${
                  currentSlide === index
                    ? "w-8 bg-white"
                    : "w-2 bg-white/50 hover:bg-white/75"
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        )}
      </section>

      {/* Categories */}
      <section className="py-12 md:py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {categories.map((category, index) => (
              <Link
                key={category.name}
                href={category.href}
                className="animate-on-scroll group relative rounded-3xl overflow-hidden bg-gray-900 text-white shadow-lg hover:-translate-y-2 hover:shadow-2xl transition-all duration-300"
                style={{ transitionDelay: `${index * 100}ms` }}
              >
                <div
                  className="absolute inset-0 bg-cover bg-center opacity-70 group-hover:opacity-50 transition-opacity duration-300"
                  style={{ backgroundImage: `url(${category.image})` }}
                />
                <div className="absolute inset-0 bg-linear-to-t from-gray-900 via-gray-900/60 to-transparent" />

                <div className="relative p-8 min-h-[280px] flex flex-col justify-end">
                  <div
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-full bg-linear-to-r ${category.gradient} text-sm font-medium backdrop-blur-sm mb-4 w-fit`}
                  >
                    <category.icon className="w-4 h-4" />
                    <span>Khám phá ngay</span>
                  </div>
                  <h3 className="text-2xl md:text-3xl font-bold mb-2">
                    {category.name}
                  </h3>
                  <div className="flex items-center gap-2 text-blue-100 group-hover:gap-3 transition-all">
                    <span>Xem thêm</span>
                    <ArrowRight className="w-5 h-5" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-16 md:py-20 bg-linear-to-b from-gray-50 to-white animate-on-scroll">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeader
            icon={Star}
            title="Sản phẩm nổi bật"
            subtitle="Những sản phẩm được đánh giá cao nhất từ khách hàng"
          />
        </div>

        {featuredProducts.length > 0 ? (
          <div className="marquee mt-6">
            <div
              className="marquee-track gap-6 pb-3"
              style={
                {
                  "--marquee-duration": `${Math.max(26, featuredProducts.length * 4.2)}s`,
                } as MarqueeStyle
              }
            >
              {[...featuredProducts, ...featuredProducts].map((product, idx) => (
                <div
                  key={`${product.id}-${idx}`}
                  className="w-[234px] sm:w-[288px] lg:w-[324px] flex-none"
                >
                  <ProductCard product={product} index={idx % featuredProducts.length} />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-center text-gray-500">
            Hiện chưa có sản phẩm nổi bật. Hãy quay lại sau nhé!
          </p>
        )}

        <div className="text-center mt-12">
          <Link
            href="/shop/products"
            className="inline-flex items-center gap-2 px-8 py-4 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 hover:shadow-xl hover:scale-105 transition-all duration-300"
          >
            Xem tất cả sản phẩm
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      

      {/* Best Sellers */}
      <section className="py-16 md:py-20 bg-linear-to-b from-white to-gray-50 animate-on-scroll">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeader
            icon={TrendingUp}
            title="Sản phẩm bán chạy"
            subtitle="Top sản phẩm được nhiều khách hàng tin dùng nhất"
          />
        </div>

        {bestSellers.length >= 6 ? (
          <div className="marquee mt-6">
            <div
              className="marquee-track gap-6 pb-3"
              style={
                {
                  "--marquee-duration": `${Math.max(26, bestSellers.length * 4.2)}s`,
                  animationDirection: "reverse",
                } as MarqueeStyle
              }
            >
              {[...bestSellers, ...bestSellers].map((product, idx) => (
                <div
                  key={`${product.id}-${idx}`}
                  className="w-[260px] sm:w-[320px] lg:w-[360px] flex-none"
                >
                  <ProductCard product={product} index={idx % bestSellers.length} />
                </div>
              ))}
            </div>
          </div>
        ) : bestSellers.length > 0 ? (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {bestSellers.map((product, index) => (
                <ProductCard key={product.id} product={product} index={index} />
              ))}
            </div>
          </div>
        ) : (
          <p className="text-center text-gray-500">Chưa có dữ liệu bán chạy.</p>
        )}

        <div className="text-center mt-12">
          <Link
            href="/shop/products?sort=popular"
            className="inline-flex items-center gap-2 px-8 py-4 bg-linear-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold hover:shadow-xl hover:scale-105 transition-all duration-300"
          >
            Khám phá thêm
            <TrendingUp className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* New Arrivals */}
      <section className="py-16 md:py-20 bg-linear-to-b from-gray-50 to-white animate-on-scroll">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeader
            icon={Sparkles}
            title="Sản phẩm mới về"
            subtitle="Những mẫu sản phẩm vừa được cập nhật trên hệ thống"
          />
        </div>
        {newArrivals.length >= 6 ? (
          <div className="marquee mt-6">
            <div
              className="marquee-track gap-6 pb-3"
              style={
                {
                  "--marquee-duration": `${Math.max(26, newArrivals.length * 4.2)}s`,
                } as MarqueeStyle
              }
            >
              {[...newArrivals, ...newArrivals].map((product, idx) => (
                <div
                  key={`${product.id}-${idx}`}
                  className="w-[260px] sm:w-[320px] lg:w-[360px] flex-none"
                >
                  <ProductCard product={product} index={idx % newArrivals.length} />
                </div>
              ))}
            </div>
          </div>
        ) : newArrivals.length > 0 ? (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {newArrivals.map((product, index) => (
                <ProductCard key={product.id} product={product} index={index} />
              ))}
            </div>
          </div>
        ) : (
          <p className="text-center text-gray-500">
            Hiện chưa có sản phẩm mới. Vui lòng quay lại sau.
          </p>
        )}
      </section>

      {/* Top Rated */}
      <section className="py-16 md:py-20 bg-linear-to-b from-white to-gray-50 animate-on-scroll">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeader
            icon={Star}
            title="Được đánh giá cao"
            subtitle="Những sản phẩm nhận được phản hồi tốt nhất"
          />
        </div>
        {topRated.length >= 6 ? (
          <div className="marquee mt-6">
            <div
              className="marquee-track gap-6 pb-3"
              style={
                {
                  "--marquee-duration": `${Math.max(26, topRated.length * 4.2)}s`,
                  animationDirection: "reverse",
                } as MarqueeStyle
              }
            >
              {[...topRated, ...topRated].map((product, idx) => (
                <div
                  key={`${product.id}-${idx}`}
                  className="w-[260px] sm:w-[320px] lg:w-[360px] flex-none"
                >
                  <ProductCard product={product} index={idx % topRated.length} />
                </div>
              ))}
            </div>
          </div>
        ) : topRated.length > 0 ? (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {topRated.map((product, index) => (
                <ProductCard key={product.id} product={product} index={index} />
              ))}
            </div>
          </div>
        ) : (
          <p className="text-center text-gray-500">Chưa có sản phẩm nào được đánh giá.</p>
        )}
      </section>
      {/* Features Grid */}
      <section className="py-16 md:py-20 bg-white animate-on-scroll">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, idx) => (
              <div
                key={feature.title}
                className="rounded-3xl bg-linear-to-br from-gray-50 to-white p-6 border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
                style={{ transitionDelay: `${idx * 80}ms` }}
              >
                <div
                  className={`w-14 h-14 rounded-2xl bg-linear-to-br ${feature.color} text-white flex items-center justify-center mb-4 shadow-lg`}
                >
                  <feature.icon className="w-7 h-7" />
                </div>
                <h3 className="font-bold text-gray-900 mb-2 text-lg">
                  {feature.title}
                </h3>
                <p className="text-sm text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-linear-to-r from-blue-600 via-purple-600 to-pink-600 text-white animate-on-scroll">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Cần tư vấn giải pháp cho doanh nghiệp?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Đội ngũ chuyên gia của AHSO sẵn sàng hỗ trợ 24/7
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link
              href="/contact"
              className="px-8 py-4 bg-white text-blue-600 rounded-xl font-bold hover:bg-gray-100 hover:scale-105 transition-all duration-300 shadow-2xl"
            >
              Liên hệ ngay
            </Link>
            <Link
              href="tel:+84123456789"
              className="px-8 py-4 bg-white/10 backdrop-blur-sm text-white rounded-xl font-bold border-2 border-white/30 hover:bg-white/20 hover:scale-105 transition-all duration-300"
            >
              Gọi: 0901 951 351
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
