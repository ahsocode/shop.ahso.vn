"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
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
} from "lucide-react";
import { withRevealDelay } from "@/lib/reveal";

type HeroSlide = {
  image: string;
  title?: string | null;
  subtitle?: string | null;
  ctaLabel?: string | null;
  ctaHref?: string | null;
};

type Announcement = {
  id: string;
  title?: string | null;
  content?: string | null;
  imageUrl?: string | null;
  ctaLabel?: string | null;
  ctaHref?: string | null;
  isActive?: boolean | null;
  showOnLogin?: boolean | null;
  showOnVisit?: boolean | null;
};

type HeroBannerDTO = {
  imageUrl: string;
  title?: string | null;
  content?: string | null;
  ctaLabel?: string | null;
  ctaHref?: string | null;
};

type AnnouncementDTO = {
  id: string;
  title?: string | null;
  content?: string | null;
  imageUrl?: string | null;
  ctaLabel?: string | null;
  ctaHref?: string | null;
  isActive?: boolean | null;
  showOnLogin?: boolean | null;
  showOnVisit?: boolean | null;
};

type HeroBannerResponse = { data?: HeroBannerDTO[] };
type AnnouncementResponse = { data?: AnnouncementDTO[] };

const FALLBACK_SLIDES: HeroSlide[] = [
  {
    image: "/factory1.jpg",
    title: "Giải pháp công nghiệp toàn diện",
    subtitle:
      "Cung cấp thiết bị, máy móc và linh kiện công nghiệp chất lượng cao với giá cạnh tranh nhất thị trường",
  },
  {
    image: "/factory2.jpg",
    title: "Giải pháp phần mềm ứng dụng trong công nghiệp",
    subtitle:
      "Tối ưu hóa quy trình sản xuất với phần mềm thông minh và hệ thống quản lý hiện đại",
  },
  {
    image: "/factory3.jpg",
    title: "Sản phẩm công nghiệp chính hãng",
    subtitle:
      "Phân phối thiết bị và phụ tùng chính hãng, đảm bảo chất lượng và bảo hành toàn diện",
  },
];

export default function HomePageClient() {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [heroSlides, setHeroSlides] = useState<HeroSlide[]>(FALLBACK_SLIDES);
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [showAnnouncement, setShowAnnouncement] = useState(false);

  useEffect(() => {
    const interval = setInterval(
      () => setCurrentSlide((prev) => (prev + 1) % Math.max(heroSlides.length, 1)),
      5000,
    );
    return () => clearInterval(interval);
  }, [heroSlides.length]);

  useEffect(() => {
    let ignore = false;
    const fetchSlides = async () => {
      try {
        const res = await fetch("/api/hero-banners");
        if (!res.ok) return;
        const json: HeroBannerResponse = await res.json();
        if (ignore) return;
        if (Array.isArray(json?.data) && json.data.length > 0) {
          setHeroSlides(
            json.data.map((item) => ({
              image: item.imageUrl,
              title: item.title,
              subtitle: item.content,
              ctaLabel: item.ctaLabel,
              ctaHref: item.ctaHref,
            })),
          );
        }
      } catch {
        /* ignore */
      }
    };
    fetchSlides();
    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    let ignore = false;
    const fetchAnnouncements = async () => {
      try {
        const res = await fetch("/api/announcements");
        if (!res.ok) return;
        const json: AnnouncementResponse = await res.json();
        if (ignore) return;
        const items: AnnouncementDTO[] = Array.isArray(json?.data) ? json.data : [];
        const isLoggedIn = Boolean(localStorage.getItem("token"));
        for (const item of items) {
          if (!item?.isActive) continue;
          const visitAllowed = item.showOnVisit !== false;
          const loginAllowed = Boolean(item.showOnLogin) && isLoggedIn;
          let keysToSet: string[] = [];
          const visitKey = `ahso_ann_visit_${item.id}`;
          const loginKey = `ahso_ann_login_${item.id}`;
          if (visitAllowed && !sessionStorage.getItem(visitKey)) {
            keysToSet = [visitKey];
          } else if (loginAllowed && !sessionStorage.getItem(loginKey)) {
            keysToSet = [loginKey];
          }
          if (keysToSet.length === 0) continue;
          setAnnouncement(item);
          setShowAnnouncement(true);
          keysToSet.forEach((key) => sessionStorage.setItem(key, "1"));
          break;
        }
      } catch {
        /* ignore */
      }
    };
    fetchAnnouncements();
    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
    if (!("IntersectionObserver" in window) || els.length === 0) return;

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            (e.target as HTMLElement).classList.add("is-visible");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -10% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  const categories = [
    {
      name: "Giải pháp Công nghiệp",
      href: "/shop/solutions",
      countLabel: "Khám phá giải pháp",
      icon: Factory,
      image: "/factory1.jpg",
      gradient: "from-blue-500 to-cyan-500",
    },
    {
      name: "Phần mềm & Dịch vụ",
      href: "/shop/software",
      countLabel: "Phần mềm, dịch vụ",
      icon: Laptop,
      image: "/factory2.jpg",
      gradient: "from-purple-500 to-pink-500",
    },
    {
      name: "Sản phẩm & Linh kiện Công Nghiệp",
      href: "/shop/products",
      countLabel: "Xem sản phẩm",
      icon: Package,
      image: "/linhkien1.jpg",
      gradient: "from-green-500 to-emerald-500",
    },
  ];

  const features = [
    {
      icon: Settings,
      title: "Máy móc công nghiệp",
      description: "Máy móc hiện đại, hiệu suất cao cho mọi quy mô sản xuất",
      color: "from-blue-500 to-blue-600",
    },
    {
      icon: Wrench,
      title: "Phụ tùng thay thế",
      description: "Linh kiện chính hãng, tương thích hoàn hảo với thiết bị",
      color: "from-purple-500 to-purple-600",
    },
    {
      icon: BadgeCheck,
      title: "Bảo hành chính hãng",
      description: "Cam kết chất lượng với chính sách bảo hành toàn diện",
      color: "from-green-500 to-green-600",
    },
    {
      icon: Clock,
      title: "Giao hàng nhanh",
      description: "Vận chuyển toàn quốc, giao hàng nhanh chóng",
      color: "from-orange-500 to-orange-600",
    },
    {
      icon: Headphones,
      title: "Tư vấn chuyên nghiệp",
      description: "Đội ngũ kỹ thuật giàu kinh nghiệm hỗ trợ 24/7",
      color: "from-red-500 to-red-600",
    },
    {
      icon: Award,
      title: "Giá cả cạnh tranh",
      description: "Giá tốt nhất thị trường với nhiều ưu đãi hấp dẫn",
      color: "from-yellow-500 to-yellow-600",
    },
  ];

  const activeSlide = heroSlides[currentSlide] ?? FALLBACK_SLIDES[0];

  return (
    <div ref={rootRef} className="min-h-screen bg-gray-50">
      {/* Hero */}
      <section className="relative h-[600px] md:h-[700px] overflow-hidden">
        <div className="absolute inset-0">
          {heroSlides.map((slide, index) => (
            <div
              key={`${slide.image}-${index}`}
              className="absolute inset-0 transition-opacity duration-1000 ease-in-out"
              style={{
                opacity: currentSlide === index ? 1 : 0,
                backgroundImage: `url(${slide.image})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            >
              <div className="absolute inset-0 bg-linear-to-r from-blue-900/90 via-blue-800/70 to-transparent" />
            </div>
          ))}
        </div>

        <div className="relative z-10 h-full flex items-center">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 w-full">
            <div className="max-w-3xl">
              <div
                className="inline-block mb-4 px-4 py-2 bg-blue-500/20 backdrop-blur-sm rounded-full border border-blue-400/30"
                data-reveal
              >
                <span className="text-blue-200 text-sm font-medium">
                  🏭 Giải pháp công nghiệp hàng đầu
                </span>
              </div>

              <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight text-white animate-fade-in">
                {activeSlide.title ?? FALLBACK_SLIDES[0].title}
              </h1>

              <p className="text-xl md:text-2xl mb-8 text-blue-100 animate-fade-in-delay">
                {activeSlide.subtitle ?? FALLBACK_SLIDES[0].subtitle}
              </p>

              <div
                className="flex flex-wrap gap-4 animate-fade-in-delay-2"
                data-reveal
                style={withRevealDelay("120ms")}
              >
                <Link
                  href="/shop/products"
                  className="group px-8 py-4 bg-white text-blue-600 rounded-lg font-semibold shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 flex items-center gap-2"
                >
                  Khám phá sản phẩm
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>

                <Link
                  href="/contact"
                  className="px-8 py-4 bg-blue-500/20 backdrop-blur-sm text-white rounded-lg font-semibold border-2 border-white/30 hover:bg-blue-500/30 hover:scale-105 transition-all duration-300 flex items-center gap-2"
                >
                  Liên hệ tư vấn
                  <Phone className="w-5 h-5" />
                </Link>

                {activeSlide.ctaLabel && activeSlide.ctaHref && (
                  <Link
                    href={activeSlide.ctaHref}
                    className="px-8 py-4 bg-green-500 text-white rounded-lg font-semibold shadow hover:bg-green-600 transition-all duration-300"
                  >
                    {activeSlide.ctaLabel}
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {categories.map((category, index) => (
              <Link
                key={category.name}
                href={category.href}
                data-reveal
                style={withRevealDelay(`${index * 60}ms`)}
                className="group relative rounded-3xl overflow-hidden bg-gray-900 text-white shadow-lg hover:-translate-y-1 transition-transform duration-300"
              >
                <div
                  className="absolute inset-0 bg-cover bg-center opacity-70"
                  style={{ backgroundImage: `url(${category.image})` }}
                ></div>
                <div className="absolute inset-0 bg-linear-to-t from-gray-900/90 via-gray-900/30 to-transparent"></div>

                <div className="relative p-6 space-y-3">
                  <div
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-full bg-linear-to-r ${category.gradient} text-sm font-medium backdrop-blur`}
                  >
                    <category.icon className="w-4 h-4" />
                    {category.countLabel}
                  </div>
                  <h3 className="text-2xl font-semibold">{category.name}</h3>
                  <div className="flex items-center gap-2 text-sm text-blue-100">
                    Khám phá <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid gap-6 md:grid-cols-3">
            {features.map((feature, idx) => (
              <div
                key={feature.title}
                className="rounded-3xl bg-white shadow-lg p-6 border border-gray-100"
                data-reveal
                style={withRevealDelay(`${idx * 80}ms`)}
              >
                <div
                  className={`w-12 h-12 rounded-2xl bg-linear-to-br ${feature.color} text-white flex items-center justify-center mb-4`}
                >
                  <feature.icon className="w-6 h-6" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-sm text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Announcement Modal */}
      {announcement && showAnnouncement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="relative w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
            <button
              aria-label="Đóng"
              onClick={() => setShowAnnouncement(false)}
              className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
            {announcement.imageUrl && (
              <div className="mb-4 overflow-hidden rounded-2xl border relative h-48 w-full">
                <Image
                  src={announcement.imageUrl}
                  alt={announcement.title ?? "Thông báo"}
                  fill
                  sizes="600px"
                  className="object-cover"
                />
              </div>
            )}
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {announcement.title ?? "Thông báo"}
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              {announcement.content ?? "Ưu đãi mới nhất từ AHSO."}
            </p>
            <div className="flex flex-wrap gap-3">
              {announcement.ctaLabel && announcement.ctaHref && (
                <Link
                  href={announcement.ctaHref}
                  className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                  onClick={() => setShowAnnouncement(false)}
                >
                  {announcement.ctaLabel}
                </Link>
              )}
              <button
                onClick={() => setShowAnnouncement(false)}
                className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
