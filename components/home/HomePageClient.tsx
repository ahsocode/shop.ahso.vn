"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, type ComponentType } from "react";
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
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from "lucide-react";

type HeroSlide = {
  image: string;
  title?: string | null;
  subtitle?: string | null;
  ctaLabel?: string | null;
  ctaHref?: string | null;
};

const FALLBACK_IMAGE = "/logo.png";

const FALLBACK_SLIDES: HeroSlide[] = [
  {
    image: "/factory1.jpg",
    title: "Giải pháp công nghiệp toàn diện",
    subtitle: "Cung cấp thiết bị, máy móc và linh kiện công nghiệp chất lượng cao",
  },
  {
    image: "/factory2.jpg",
    title: "Giải pháp phần mềm ứng dụng trong công nghiệp",
    subtitle: "Tối ưu hóa quy trình sản xuất với phần mềm thông minh",
  },
  {
    image: "/factory3.jpg",
    title: "Sản phẩm công nghiệp chính hãng",
    subtitle: "Phân phối thiết bị và phụ tùng chính hãng, bảo hành toàn diện",
  },
];

type HeroBannerResponse = {
  data?: Array<{
    imageUrl: string;
    title?: string | null;
    content?: string | null;
    ctaLabel?: string | null;
    ctaHref?: string | null;
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
  const hasDiscount = listPrice !== null && listPrice > price;
  const discount = hasDiscount ? Math.round(((listPrice - price) / listPrice) * 100) : 0;
  const priceLabel =
    product.requiresQuote || product.price === null
      ? "Liên hệ báo giá"
      : `${price.toLocaleString("vi-VN")}₫`;

  return (
    <div
      className="animate-slide-up group bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-2xl transition-all duration-300 flex flex-col"
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

        <div className="flex items-end justify-between">
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

export default function HomePageClient() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [heroSlides, setHeroSlides] = useState<HeroSlide[]>(FALLBACK_SLIDES);
  const [featuredProducts, setFeaturedProducts] = useState<HomeProduct[]>([]);
  const [bestSellers, setBestSellers] = useState<HomeProduct[]>([]);
  const [newArrivals, setNewArrivals] = useState<HomeProduct[]>([]);
  const [topRated, setTopRated] = useState<HomeProduct[]>([]);

  // Auto-rotate slides
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [heroSlides.length]);

  // Fetch hero banners + highlighted product lists
  useEffect(() => {
    let ignore = false;
    const fetchData = async () => {
      try {
        const [heroRes, featuredRes, bestRes, newRes, topRes] = await Promise.all([
          fetch("/api/hero-banners"),
          fetch("/api/featured-products?limit=4"),
          fetch("/api/products/best-sellers?limit=4"),
          fetch("/api/products/new-arrivals?limit=4"),
          fetch("/api/products/top-rated?limit=4"),
        ]);

        const heroJson: HeroBannerResponse = heroRes.ok ? await heroRes.json() : {};
        const featuredJson: FeaturedProductResponse = featuredRes.ok
          ? await featuredRes.json()
          : { data: [] };
        const bestJson: ProductListResponse = bestRes.ok ? await bestRes.json() : { data: [] };
        const newJson: ProductListResponse = newRes.ok ? await newRes.json() : { data: [] };
        const topJson: ProductListResponse = topRes.ok ? await topRes.json() : { data: [] };

        if (ignore) return;

        if (Array.isArray(heroJson?.data) && heroJson.data.length > 0) {
          setHeroSlides(
            heroJson.data.map((item) => ({
              image: item.imageUrl,
              title: item.title,
              subtitle: item.content,
              ctaLabel: item.ctaLabel,
              ctaHref: item.ctaHref,
            })),
          );
        }

        setFeaturedProducts(
          (featuredJson?.data ?? []).map((item) =>
            normalizeProductData(item.product ?? null, {
              fallbackName: item.title ?? undefined,
              fallbackId: item.id?.toString(),
            }),
          ),
        );
        setBestSellers((bestJson?.data ?? []).map((item) => normalizeProductData(item)));
        setNewArrivals((newJson?.data ?? []).map((item) => normalizeProductData(item)));
        setTopRated((topJson?.data ?? []).map((item) => normalizeProductData(item)));
      } catch (error) {
        console.error("Failed to load homepage data:", error);
      }
    };
    fetchData();
    return () => {
      ignore = true;
    };
  }, []);

  // Intersection Observer for scroll animations
  useEffect(() => {
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
  }, []);

  const activeSlide = heroSlides[currentSlide] || FALLBACK_SLIDES[0];
  const hasContent = activeSlide.title || activeSlide.subtitle;

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + heroSlides.length) % heroSlides.length);
  };

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
      `}</style>

      {/* Hero Section */}
      <section className="relative h-[500px] md:h-[600px] lg:h-[700px] overflow-hidden">
        {/* Background Slides */}
        <div className="absolute inset-0">
          {heroSlides.map((slide, index) => (
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
              {hasContent && (
                <div className="absolute inset-0 bg-linear-to-r from-blue-900/90 via-blue-800/70 to-blue-900/50" />
              )}
            </div>
          ))}
        </div>

        {/* Content Overlay - Only if has content */}
        {hasContent && (
          <div className="relative z-10 h-full flex items-center">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 w-full">
              <div className="max-w-3xl">
                <div className="inline-block mb-4 px-4 py-2 bg-blue-500/20 backdrop-blur-sm rounded-full border border-blue-400/30 animate-fade-in-up">
                  <span className="text-blue-200 text-sm font-medium">
                    🏭 Giải pháp công nghiệp hàng đầu
                  </span>
                </div>

                {activeSlide.title && (
                  <h1
                    className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight text-white animate-fade-in-up"
                    style={{ animationDelay: "0.1s" }}
                  >
                    {activeSlide.title}
                  </h1>
                )}

                {activeSlide.subtitle && (
                  <p
                    className="text-lg md:text-xl lg:text-2xl mb-8 text-blue-100 animate-fade-in-up"
                    style={{ animationDelay: "0.2s" }}
                  >
                    {activeSlide.subtitle}
                  </p>
                )}

                <div
                  className="flex flex-wrap gap-4 animate-fade-in-up"
                  style={{ animationDelay: "0.3s" }}
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

                  {activeSlide.ctaLabel && activeSlide.ctaHref && (
                    <Link
                      href={activeSlide.ctaHref}
                      className="px-6 md:px-8 py-3 md:py-4 bg-green-500 text-white rounded-xl font-semibold shadow hover:bg-green-600 hover:scale-105 transition-all duration-300"
                    >
                      {activeSlide.ctaLabel}
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Arrows */}
        {heroSlides.length > 1 && (
          <>
            <button
              onClick={prevSlide}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white/30 transition-all"
              aria-label="Previous slide"
            >
              <ChevronLeft className="w-6 h-6 text-white" />
            </button>
            <button
              onClick={nextSlide}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white/30 transition-all"
              aria-label="Next slide"
            >
              <ChevronRight className="w-6 h-6 text-white" />
            </button>
          </>
        )}

        {/* Slide Indicators */}
        {heroSlides.length > 1 && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex gap-2">
            {heroSlides.map((_, index) => (
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeader
            icon={Star}
            title="Sản phẩm nổi bật"
            subtitle="Những sản phẩm được đánh giá cao nhất từ khách hàng"
          />

          {featuredProducts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {featuredProducts.map((product, index) => (
                <ProductCard key={product.id} product={product} index={index} />
              ))}
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
        </div>
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

      {/* Best Sellers */}
      <section className="py-16 md:py-20 bg-linear-to-b from-white to-gray-50 animate-on-scroll">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeader
            icon={TrendingUp}
            title="Sản phẩm bán chạy"
            subtitle="Top sản phẩm được nhiều khách hàng tin dùng nhất"
          />

          {bestSellers.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {bestSellers.map((product, index) => (
                <ProductCard key={product.id} product={product} index={index} />
              ))}
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
        </div>
      </section>

      {/* New Arrivals */}
      <section className="py-16 md:py-20 bg-linear-to-b from-gray-50 to-white animate-on-scroll">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeader
            icon={Sparkles}
            title="Sản phẩm mới về"
            subtitle="Những mẫu sản phẩm vừa được cập nhật trên hệ thống"
          />
          {newArrivals.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {newArrivals.map((product, index) => (
                <ProductCard key={product.id} product={product} index={index} />
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500">
              Hiện chưa có sản phẩm mới. Vui lòng quay lại sau.
            </p>
          )}
        </div>
      </section>

      {/* Top Rated */}
      <section className="py-16 md:py-20 bg-linear-to-b from-white to-gray-50 animate-on-scroll">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeader
            icon={Star}
            title="Được đánh giá cao"
            subtitle="Những sản phẩm nhận được phản hồi tốt nhất"
          />
          {topRated.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {topRated.map((product, index) => (
                <ProductCard key={product.id} product={product} index={index} />
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500">Chưa có sản phẩm nào được đánh giá.</p>
          )}
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
              Gọi: 0123 456 789
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
