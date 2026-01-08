"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, type ComponentType, type CSSProperties } from "react";
import { Phone, ArrowRight, Package, Factory, Laptop, Star } from "lucide-react";
import QuoteRequestButton from "@/app/shop/products/QuoteRequestButton";
import { SiteAnnouncementModal } from "@/components/announcements/SiteAnnouncementModal";

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
  textColor?: string | null;
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
    textColor?: string | null;
  }>;
};

type FeaturedProductResponse = {
  data?: Array<{
    id?: string | number;
    title?: string | null;
    product?: ApiProduct | null;
  }>;
};

type FeaturedSolutionResponse = {
  data?: Array<{
    id: string;
    title?: string | null;
    description?: string | null;
    solution?: {
      id: string;
      title: string;
      slug: string;
      summary?: string | null;
      image?: string | null;
      categoryName?: string | null;
    } | null;
  }>;
};

type FeaturedSoftwareResponse = {
  data?: Array<{
    id: string;
    title?: string | null;
    description?: string | null;
    software?: {
      id: string;
      title: string;
      slug: string;
      summary?: string | null;
      image?: string | null;
      categoryName?: string | null;
    } | null;
  }>;
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
  isFeatured?: boolean;
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
  isFeatured?: boolean | null;
};

type MarqueeStyle = CSSProperties & { "--marquee-duration"?: string };

function normalizeProductData(
  source: ApiProduct | null | undefined,
  options: { fallbackName?: string; fallbackId?: string; isFeatured?: boolean } = {},
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
    isFeatured: options.isFeatured ?? Boolean(product.isFeatured),
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
        {product.isFeatured && (
          <span className="absolute top-3 left-3 rounded-full bg-amber-500 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white shadow">
            Nổi bật
          </span>
        )}
        {hasDiscount && (
          <div className="absolute top-3 right-3 bg-red-500 text-white px-3 py-1 rounded-full text-xs font-bold animate-pulse">
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

type FeaturedContent = {
  id: string;
  title: string;
  summary: string | null;
  image: string;
  href: string;
  categoryName: string | null;
  isFeatured?: boolean;
};

function normalizeFeaturedContent(input: {
  id: string;
  title?: string | null;
  description?: string | null;
  entity?: {
    title?: string | null;
    slug?: string | null;
    summary?: string | null;
    image?: string | null;
    categoryName?: string | null;
  } | null;
  baseHref: string;
  isFeatured?: boolean;
}): FeaturedContent {
  const title = input.title?.trim() || input.entity?.title?.trim() || "Nội dung nổi bật";
  const slug = input.entity?.slug?.trim();
  const summary = input.description || input.entity?.summary || null;
  const image = input.entity?.image || FALLBACK_IMAGE;
  return {
    id: input.id,
    title,
    summary,
    image,
    href: slug ? `${input.baseHref}/${slug}` : input.baseHref,
    categoryName: input.entity?.categoryName ?? null,
    isFeatured: input.isFeatured ?? false,
  };
}

function FeaturedMarqueeCard({ item }: { item: FeaturedContent }) {
  return (
      <Link
      href={item.href}
      className="group w-full rounded-2xl border border-slate-200 bg-white p-4 overflow-hidden transition-all hover:-translate-y-1 hover:shadow-lg focus:outline-none focus-visible:ring-0"
    >
      <div className="relative mb-3 aspect-square w-full overflow-hidden rounded-xl bg-slate-100">
        <Image
          src={item.image}
          alt={item.title}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          sizes="320px"
        />
        {item.isFeatured && (
          <span className="absolute left-3 top-3 rounded-full bg-amber-500 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-white shadow">
            Nổi bật
          </span>
        )}
      </div>
      {item.categoryName && (
        <p className="text-[11px] uppercase tracking-wide text-slate-500 mb-1">
          {item.categoryName}
        </p>
      )}
      <h3 className="text-sm font-semibold text-slate-900 line-clamp-2">
        {item.title}
      </h3>
      {item.summary && (
        <p className="mt-2 text-xs text-slate-600 line-clamp-2">
          {item.summary}
        </p>
      )}
    </Link>
  );
}

type SectionHeaderProps = {
  icon: ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
};

function SectionHeader({ icon: Icon, title, subtitle }: SectionHeaderProps) {
  return (
    <div className="text-center mb-10 animate-fade-in-up">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-slate-100 text-slate-700 mb-4">
        <Icon className="w-6 h-6" />
      </div>
      <h2 className="text-2xl md:text-3xl font-semibold text-slate-900 mb-2">{title}</h2>
      <p className="text-slate-600 max-w-2xl mx-auto">{subtitle}</p>
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
        <div className="text-sm text-gray-500">Đang tải...</div>
      </div>
    </div>
  );
}

export default function HomePageClient() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [heroSlides, setHeroSlides] = useState<HeroSlide[] | null>(null);
  const [featuredProducts, setFeaturedProducts] = useState<HomeProduct[]>([]);
  const [featuredSolutions, setFeaturedSolutions] = useState<FeaturedSolutionResponse["data"]>(
    [],
  );
  const [featuredSoftwares, setFeaturedSoftwares] = useState<FeaturedSoftwareResponse["data"]>(
    [],
  );
  const [activeSolutionIndex, setActiveSolutionIndex] = useState(0);
  const [activeSoftwareIndex, setActiveSoftwareIndex] = useState(0);
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
        const solutionData: FeaturedSolutionResponse["data"] =
          json?.data?.featuredSolutions ?? [];
        const softwareData: FeaturedSoftwareResponse["data"] =
          json?.data?.featuredSoftwares ?? [];

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
                textColor: item.textColor,
              }))
            : [],
        );

        setFeaturedProducts(
          Array.isArray(featuredData)
            ? featuredData.map((item) =>
                normalizeProductData(item.product ?? null, {
                  fallbackName: item.title ?? undefined,
                  fallbackId: item.id?.toString(),
                  isFeatured: true,
                }),
              )
            : [],
        );
        setFeaturedSolutions(Array.isArray(solutionData) ? solutionData : []);
        setFeaturedSoftwares(Array.isArray(softwareData) ? softwareData : []);
      } catch (error) {
        console.error("Failed to load homepage data:", error);
        if (!ignore) {
          setHeroSlides([]);
          setFeaturedProducts([]);
          setFeaturedSolutions([]);
          setFeaturedSoftwares([]);
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
  const normalizeTextColor = (value?: string | null) => {
    if (!value) return "#ffffff";
    if (/rgba?\(/i.test(value) || /hsla?\(/i.test(value)) return value;
    if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(value)) return value;
    return "#ffffff";
  };
  const textColor = normalizeTextColor(hasSlides ? activeSlide?.textColor : null);

  const solutionItems = (featuredSolutions ?? []).map((item) =>
    normalizeFeaturedContent({
      id: item.id,
      title: item.title,
      description: item.description,
      entity: item.solution ?? undefined,
      baseHref: "/solutions",
      isFeatured: true,
    }),
  );
  const softwareItems = (featuredSoftwares ?? []).map((item) =>
    normalizeFeaturedContent({
      id: item.id,
      title: item.title,
      description: item.description,
      entity: item.software ?? undefined,
      baseHref: "/software",
      isFeatured: true,
    }),
  );

  useEffect(() => {
    if (solutionItems.length <= 1) return;
    const timer = setInterval(() => {
      setActiveSolutionIndex((prev) => (prev + 1) % solutionItems.length);
    }, 7000);
    return () => clearInterval(timer);
  }, [solutionItems.length]);

  useEffect(() => {
    if (softwareItems.length <= 1) return;
    const timer = setInterval(() => {
      setActiveSoftwareIndex((prev) => (prev + 1) % softwareItems.length);
    }, 7000);
    return () => clearInterval(timer);
  }, [softwareItems.length]);
  const activeSolution =
    solutionItems.length > 0
      ? solutionItems[activeSolutionIndex % solutionItems.length]
      : null;
  const activeSoftware =
    softwareItems.length > 0
      ? softwareItems[activeSoftwareIndex % softwareItems.length]
      : null;

  const shouldAnimateHero = heroAnimated && !heroAnimationDone;

  if (isLoading) {
    return <HomePageLoading />;
  }

  return (
    <div className="min-h-screen bg-white">
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

        .marquee,
        .marquee-clean {
          position: relative;
          overflow: hidden;
        }

        .marquee-track {
          display: flex;
          width: max-content;
          animation: marqueeX var(--marquee-duration, 28s) linear infinite;
          will-change: transform;
        }

        .marquee:hover .marquee-track,
        .marquee-clean:hover .marquee-track {
          animation-play-state: paused;
        }

        .marquee::before,
        .marquee::after,
        .marquee-clean::before,
        .marquee-clean::after {
          content: none !important;
          display: none !important;
          background: transparent !important;
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
                    style={{ animationDelay: "0.1s", color: textColor }}
                  >
                    {displayTitle}
                  </h1>
                )}

                {displaySubtitle && (
                  <p
                    className={`text-lg md:text-xl lg:text-2xl mb-8 text-blue-100 ${
                      shouldAnimateHero ? "animate-fade-in-up" : ""
                    }`}
                    style={{ animationDelay: "0.2s", color: textColor }}
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

      <SiteAnnouncementModal />

      {/* Solutions */}
      <section className="py-12 md:py-16 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-end justify-between gap-3 mb-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Giải pháp
              </p>
              <h2 className="text-2xl md:text-3xl font-semibold text-slate-900 mt-2">
                Giải pháp nổi bật
              </h2>
            </div>
            <Link
              href="/solutions"
              className="text-sm font-medium text-slate-700 hover:text-slate-900 inline-flex items-center gap-2"
            >
              Xem tất cả giải pháp
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 lg:order-1">
              <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase text-slate-500">
                <Factory className="w-4 h-4" />
                Giải pháp là gì
              </div>
              <p className="mt-4 text-sm text-slate-700 leading-relaxed">
                Các gói giải pháp giúp doanh nghiệp tối ưu quy trình vận hành,
                tăng hiệu suất và giảm chi phí triển khai. Tất cả đều được chọn
                lọc theo nhu cầu công nghiệp thực tế.
              </p>
              <div className="mt-6 text-xs text-slate-500">
                Tập trung vào tính ổn định, khả năng mở rộng và tính tương thích.
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 lg:col-span-2 lg:order-2">
              {activeSolution ? (
                <div className="grid gap-6 md:grid-cols-[1.05fr_1fr] items-center">
                  <div className="space-y-3 min-w-0">
                    {activeSolution.categoryName && (
                      <p className="text-xs uppercase tracking-wide text-slate-500">
                        {activeSolution.categoryName}
                      </p>
                    )}
                    <h3 className="text-xl font-semibold text-slate-900 line-clamp-2">
                      {activeSolution.title}
                    </h3>
                    <p className="text-sm text-slate-600 leading-relaxed line-clamp-4">
                      {activeSolution.summary || "Giải pháp tổng thể cho nhu cầu vận hành hiện đại."}
                    </p>
                    <Link
                      href={activeSolution.href}
                      className="inline-flex items-center gap-2 text-sm font-medium text-slate-900"
                    >
                      Xem chi tiết
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                  <div className="relative h-56 md:h-64 rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
                    <Image
                      src={activeSolution.image}
                      alt={activeSolution.title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 420px"
                    />
                  </div>
                </div>
              ) : (
                <div className="text-sm text-slate-500">
                  Hiện chưa có giải pháp nổi bật. Vui lòng quay lại sau.
                </div>
              )}
            </div>
          </div>

          {solutionItems.length > 0 && (
            <div className="mt-10">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400 mb-4">
                Giải pháp khác
              </div>
              {solutionItems.length >= 4 ? (
                <div className="marquee-clean">
                  <div
                    className="marquee-track gap-6 pb-3"
                    style={
                      {
                        "--marquee-duration": `${Math.max(26, solutionItems.length * 4.2)}s`,
                      } as MarqueeStyle
                    }
                  >
                    {[...solutionItems, ...solutionItems].map((item, idx) => (
                      <div
                        key={`${item.id}-${idx}`}
                        className="w-60 sm:w-[280px] lg:w-[320px] flex-none"
                      >
                        <FeaturedMarqueeCard item={item} />
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {solutionItems.map((item) => (
                    <FeaturedMarqueeCard key={item.id} item={item} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Softwares */}
      <section className="py-12 md:py-16 bg-slate-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-end justify-between gap-3 mb-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Phần mềm
              </p>
              <h2 className="text-2xl md:text-3xl font-semibold text-slate-900 mt-2">
                Phần mềm nổi bật
              </h2>
            </div>
            <Link
              href="/software"
              className="text-sm font-medium text-slate-700 hover:text-slate-900 inline-flex items-center gap-2"
            >
              Xem tất cả phần mềm
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 lg:order-1 lg:col-span-2">
              {activeSoftware ? (
                <div className="grid gap-6 md:grid-cols-[1fr_1.05fr] items-center">
                  <div className="relative h-56 md:h-64 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 md:order-1">
                    <Image
                      src={activeSoftware.image}
                      alt={activeSoftware.title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 420px"
                    />
                  </div>
                  <div className="space-y-3 min-w-0 md:order-2">
                    {activeSoftware.categoryName && (
                      <p className="text-xs uppercase tracking-wide text-slate-500">
                        {activeSoftware.categoryName}
                      </p>
                    )}
                    <h3 className="text-xl font-semibold text-slate-900 line-clamp-2">
                      {activeSoftware.title}
                    </h3>
                    <p className="text-sm text-slate-600 leading-relaxed line-clamp-4">
                      {activeSoftware.summary || "Bộ công cụ phần mềm hỗ trợ vận hành chính xác và an toàn."}
                    </p>
                    <Link
                      href={activeSoftware.href}
                      className="inline-flex items-center gap-2 text-sm font-medium text-slate-900"
                    >
                      Xem chi tiết
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-slate-500">
                  Hiện chưa có phần mềm nổi bật. Vui lòng quay lại sau.
                </div>
              )}
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-100 p-6 lg:order-2">
              <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase text-slate-500">
                <Laptop className="w-4 h-4" />
                Phần mềm là gì
              </div>
              <p className="mt-4 text-sm text-slate-700 leading-relaxed">
                Các giải pháp phần mềm giúp số hóa, giám sát và tự động hóa quy
                trình trong nhà máy. Tập trung vào độ chính xác, bảo mật và khả
                năng tích hợp.
              </p>
              <div className="mt-6 text-xs text-slate-500">
                Phù hợp cho nhiều quy mô doanh nghiệp công nghiệp.
              </div>
            </div>
            
          </div>

          {softwareItems.length > 0 && (
            <div className="mt-10">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400 mb-4">
                Phần mềm khác
              </div>
              {softwareItems.length >= 4 ? (
                <div className="marquee-clean">
                  <div
                    className="marquee-track gap-6 pb-3"
                    style={
                      {
                        "--marquee-duration": `${Math.max(26, softwareItems.length * 4.2)}s`,
                        animationDirection: "reverse",
                      } as MarqueeStyle
                    }
                  >
                    {[...softwareItems, ...softwareItems].map((item, idx) => (
                      <div
                        key={`${item.id}-${idx}`}
                        className="w-60 sm:w-[280px] lg:w-[320px] flex-none"
                      >
                        <FeaturedMarqueeCard item={item} />
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {softwareItems.map((item) => (
                    <FeaturedMarqueeCard key={item.id} item={item} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-16 md:py-20 bg-white animate-on-scroll">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeader
            icon={Package}
            title="Sản phẩm nổi bật"
            subtitle="Chọn lọc các sản phẩm tiêu biểu cho nhu cầu công nghiệp"
          />
        </div>

        {featuredProducts.length > 0 ? (
          <div className="marquee mt-6">
              <div
                className="marquee-track gap-6 pb-3"
                style={
                  {
                    "--marquee-duration": `${Math.max(33.8, featuredProducts.length * 5.46)}s`,
                  } as MarqueeStyle
                }
              >
                {[...featuredProducts, ...featuredProducts].map((product, idx) => (
                  <div
                    key={`${product.id}-${idx}`}
                    className="w-[188px] sm:w-[230px] lg:w-[259px] flex-none"
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
            className="inline-flex items-center gap-2 px-8 py-3 border border-slate-300 text-slate-800 rounded-xl font-semibold hover:border-slate-400 hover:text-slate-900 transition-all duration-300"
          >
            Xem tất cả sản phẩm
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>
      {/* Features Grid */}
      {/* <section className="py-16 md:py-20 bg-white animate-on-scroll">
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
      </section> */}

      {/* CTA Section */}
      {/* <section className="py-20 bg-linear-to-r from-blue-600 via-purple-600 to-pink-600 text-white animate-on-scroll">
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
      </section> */}
    </div>
  );
}
