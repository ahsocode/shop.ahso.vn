"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  Factory,
  Laptop,
  Phone,
  ShieldCheck,
} from "lucide-react";
import { SiteAnnouncementModal } from "@/components/announcements/SiteAnnouncementModal";
import { FeaturedSolutionsShowcase } from "@/components/home/FeaturedSolutionsShowcase";

type HeroSlide = {
  image: string;
  title?: string | null;
  subtitle?: string | null;
  ctaLabel?: string | null;
  ctaHref?: string | null;
  overlayOn?: boolean | null;
  overlayColor?: string | null;
  textColor?: string | null;
  textPosition?:
    | "TOP_LEFT"
    | "TOP_RIGHT"
    | "MIDDLE_LEFT"
    | "MIDDLE_RIGHT"
    | "BOTTOM_LEFT"
    | "BOTTOM_RIGHT";
};

type FeaturedContent = {
  id: string;
  title: string;
  summary: string | null;
  image: string;
  href: string;
  categoryName: string | null;
};

type HomeFeedResponse = {
  data?: {
    hero?: Array<{
      imageUrl: string;
      title?: string | null;
      content?: string | null;
      ctaLabel?: string | null;
      ctaHref?: string | null;
      overlayOn?: boolean | null;
      overlayColor?: string | null;
      textColor?: string | null;
      textPosition?:
        | "TOP_LEFT"
        | "TOP_RIGHT"
        | "MIDDLE_LEFT"
        | "MIDDLE_RIGHT"
        | "BOTTOM_LEFT"
        | "BOTTOM_RIGHT";
    }>;
    featuredSolutions?: Array<{
      id: string;
      title?: string | null;
      description?: string | null;
      solution?: {
        title: string;
        slug: string;
        summary?: string | null;
        image?: string | null;
        categoryName?: string | null;
      } | null;
    }>;
    featuredSoftwares?: Array<{
      id: string;
      title?: string | null;
      description?: string | null;
      software?: {
        title: string;
        slug: string;
        summary?: string | null;
        image?: string | null;
        categoryName?: string | null;
      } | null;
    }>;
  };
};

const SHOP_URL = "https://shop.ahso.vn";
const FALLBACK_IMAGE = "/logo.png";
const DEFAULT_OVERLAY = "rgba(15, 23, 42, 0.28)";

function resolveHeroOverlayColor(value?: string | null) {
  const raw = value?.trim();
  if (!raw) return DEFAULT_OVERLAY;

  const rgba = raw.match(
    /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*([01]?(?:\.\d+)?))?\s*\)$/i,
  );
  if (rgba) {
    const [, r, g, b, alpha] = rgba;
    const resolvedAlpha = Math.min(Number(alpha ?? 0.35), 0.45);
    return `rgba(${r}, ${g}, ${b}, ${resolvedAlpha})`;
  }

  const hsla = raw.match(/^hsla?\(/i);
  if (hsla) return raw;

  const normalizedHex = raw.startsWith("#") ? raw : `#${raw}`;
  if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(normalizedHex)) {
    let hex = normalizedHex.replace("#", "");
    if (hex.length === 3) {
      hex = hex.split("").map((char) => char + char).join("");
    }

    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    const alpha = hex.length === 8 ? Math.min(parseInt(hex.slice(6, 8), 16) / 255, 0.45) : 0.35;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  return DEFAULT_OVERLAY;
}

function resolveHeroTextPosition(value?: HeroSlide["textPosition"] | null) {
  switch (value) {
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
}

function resolveHeroTextAlign(value?: HeroSlide["textPosition"] | null) {
  return value === "TOP_RIGHT" || value === "MIDDLE_RIGHT" || value === "BOTTOM_RIGHT"
    ? "text-right"
    : "text-left";
}

function resolveHeroTextColor(value?: string | null) {
  const raw = value?.trim();
  if (!raw) return "#ffffff";
  if (/rgba?\(/i.test(raw) || /hsla?\(/i.test(raw)) return raw;

  const normalizedHex = raw.startsWith("#") ? raw : `#${raw}`;
  if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(normalizedHex)) {
    return normalizedHex;
  }

  return "#ffffff";
}

const proofPoints = [
  {
    label: "Giải pháp",
    value: "Tự động hóa",
    description: "Tư vấn và triển khai theo nhu cầu vận hành thực tế.",
  },
  {
    label: "Phần mềm",
    value: "Công nghiệp",
    description: "Số hóa, giám sát và tối ưu quy trình nhà máy.",
  },
  {
    label: "Đồng hành",
    value: "Từ khảo sát",
    description: "Rõ nhu cầu, rõ phương án, rõ bước triển khai tiếp theo.",
  },
];

const capabilities = [
  {
    icon: Factory,
    title: "Giải pháp công nghiệp",
    description:
      "Từ dây chuyền, hệ thống vận hành đến các bài toán tối ưu sản xuất cần tư duy kỹ thuật và triển khai chắc chắn.",
  },
  {
    icon: Laptop,
    title: "Phần mềm vận hành",
    description:
      "Các hệ thống hỗ trợ quản lý, giám sát, báo cáo và kết nối dữ liệu để doanh nghiệp ra quyết định nhanh hơn.",
  },
  {
    icon: ShieldCheck,
    title: "Tư vấn và báo giá",
    description:
      "Tiếp nhận yêu cầu, làm rõ bối cảnh và đề xuất hướng xử lý phù hợp thay vì đưa ra lời hứa phóng đại.",
  },
];

const processSteps = [
  "Tiếp nhận nhu cầu",
  "Khảo sát hiện trạng",
  "Đề xuất giải pháp",
  "Triển khai và đồng hành",
];

function normalizeContent(input: {
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
}): FeaturedContent {
  const title = input.title?.trim() || input.entity?.title?.trim() || "Nội dung nổi bật";
  const slug = input.entity?.slug?.trim();

  return {
    id: input.id,
    title,
    summary: input.description || input.entity?.summary || null,
    image: input.entity?.image || FALLBACK_IMAGE,
    href: slug ? `${input.baseHref}/${slug}` : input.baseHref,
    categoryName: input.entity?.categoryName ?? null,
  };
}

function ContentCard({ item }: { item: FeaturedContent }) {
  return (
    <Link
      href={item.href}
      className="group grid h-full overflow-hidden rounded-lg border border-slate-200 bg-white transition duration-300 hover:-translate-y-1 hover:border-slate-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
        <Image
          src={item.image}
          alt={item.title}
          fill
          className="object-cover transition duration-700 group-hover:scale-105"
          sizes="(max-width: 768px) 100vw, 33vw"
        />
      </div>
      <div className="featured-card-copy grid gap-3 p-5">
        {item.categoryName && (
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
            {item.categoryName}
          </p>
        )}
        <h3 className="featured-card-title text-lg font-semibold leading-snug text-slate-950">{item.title}</h3>
        <p className="featured-card-summary line-clamp-3 text-sm leading-6 text-slate-600">
          {item.summary || "Thông tin được AHSO chọn lọc để khách hàng nhanh chóng hiểu phạm vi và giá trị triển khai."}
        </p>
        <span className="mt-1 inline-flex items-center gap-2 text-sm font-semibold text-slate-950">
          Xem chi tiết
          <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
        </span>
      </div>
    </Link>
  );
}

function FeaturedBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex w-fit items-center rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-blue-700 ${className}`}
    >
      Nổi bật
    </span>
  );
}

function FeaturedContentCard({
  item,
  compact = false,
}: {
  item: FeaturedContent;
  compact?: boolean;
}) {
  return (
    <div className={`relative h-full ${compact ? "[&_.featured-card-copy]:p-4 [&_.featured-card-summary]:line-clamp-2 [&_.featured-card-title]:text-base" : ""}`}>
      <ContentCard item={item} />
      <div className="pointer-events-none absolute left-3 top-3">
        <FeaturedBadge className="border-white/70 bg-white/90" />
      </div>
    </div>
  );
}

function EmptyShowcase({ label }: { label: string }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-8 text-sm text-slate-600">
      Hiện chưa có {label.toLowerCase()} nổi bật. Admin có thể cập nhật nội dung trong khu vực quản trị.
    </div>
  );
}

export default function HomePageClient() {
  const pageRef = useRef<HTMLDivElement>(null);
  const softwareSectionRef = useRef<HTMLElement>(null);
  const softwareViewportRef = useRef<HTMLDivElement>(null);
  const softwareTrackRef = useRef<HTMLDivElement>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [heroSlides, setHeroSlides] = useState<HeroSlide[]>([]);
  const [solutions, setSolutions] = useState<FeaturedContent[]>([]);
  const [softwares, setSoftwares] = useState<FeaturedContent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let ignore = false;

    async function fetchHomeFeed() {
      try {
        const response = await fetch("/api/home-feed", { cache: "no-store" });
        if (!response.ok) throw new Error("Không thể tải dữ liệu trang chủ.");

        const json = (await response.json()) as HomeFeedResponse;
        if (ignore) return;

        const hero = json.data?.hero ?? [];
        setHeroSlides(
          hero.map((item) => ({
            image: item.imageUrl,
            title: item.title,
            subtitle: item.content,
            ctaLabel: item.ctaLabel,
            ctaHref: item.ctaHref,
            overlayOn: item.overlayOn,
            overlayColor: item.overlayColor,
            textColor: item.textColor,
            textPosition: item.textPosition,
          })),
        );

        setSolutions(
          (json.data?.featuredSolutions ?? []).map((item) =>
            normalizeContent({
              id: item.id,
              title: item.title,
              description: item.description,
              entity: item.solution ?? null,
              baseHref: "/solutions",
            }),
          ),
        );

        setSoftwares(
          (json.data?.featuredSoftwares ?? []).map((item) =>
            normalizeContent({
              id: item.id,
              title: item.title,
              description: item.description,
              entity: item.software ?? null,
              baseHref: "/software",
            }),
          ),
        );
      } catch (error) {
        console.error(error);
        if (!ignore) {
          setHeroSlides([]);
          setSolutions([]);
          setSoftwares([]);
        }
      } finally {
        if (!ignore) setIsLoading(false);
      }
    }

    fetchHomeFeed();
    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    if (heroSlides.length <= 1) return;
    const timer = window.setInterval(() => {
      setCurrentSlide((value) => (value + 1) % heroSlides.length);
    }, 6500);

    return () => window.clearInterval(timer);
  }, [heroSlides.length]);

  useEffect(() => {
    if (isLoading) return;

    let context: { revert: () => void } | null = null;

    async function runAnimations() {
      const [{ gsap }, { ScrollTrigger }] = await Promise.all([
        import("gsap"),
        import("gsap/ScrollTrigger"),
      ]);

      gsap.registerPlugin(ScrollTrigger);

      context = gsap.context(() => {
        gsap.from("[data-hero-item]", {
          y: 24,
          opacity: 0,
          duration: 0.8,
          ease: "power3.out",
          stagger: 0.12,
        });

        gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((element) => {
          gsap.from(element, {
            y: 28,
            opacity: 0,
            duration: 0.7,
            ease: "power3.out",
            scrollTrigger: {
              trigger: element,
              start: "top 82%",
              once: true,
            },
          });
        });

        gsap.utils.toArray<HTMLElement>("[data-parallax]").forEach((element) => {
          gsap.to(element, {
            yPercent: -8,
            ease: "none",
            scrollTrigger: {
              trigger: element,
              start: "top bottom",
              end: "bottom top",
              scrub: true,
            },
          });
        });

        ScrollTrigger.matchMedia({
          "(min-width: 1024px)": () => {
            const section = softwareSectionRef.current;
            const viewport = softwareViewportRef.current;
            const track = softwareTrackRef.current;
            if (!section || !viewport || !track) return;

            const getScrollDistance = () =>
              Math.max(0, track.scrollHeight - viewport.clientHeight);

            if (getScrollDistance() <= 0) return;

            const tween = gsap.to(track, {
              y: () => -getScrollDistance(),
              ease: "none",
              scrollTrigger: {
                trigger: section,
                start: "top top+=64",
                end: () => `+=${getScrollDistance()}`,
                scrub: true,
                pin: true,
                anticipatePin: 1,
                invalidateOnRefresh: true,
              },
            });

            return () => tween.kill();
          },
        });
      }, pageRef);
    }

    runAnimations();
    return () => context?.revert();
  }, [isLoading]);

  const activeSlide = heroSlides[currentSlide] ?? null;
  const hasHero = Boolean(activeSlide?.image);
  const hasHeroTitle = Boolean(activeSlide?.title?.trim());
  const hasHeroSubtitle = Boolean(activeSlide?.subtitle?.trim());
  const hasHeroCta = Boolean(activeSlide?.ctaLabel?.trim() && activeSlide?.ctaHref?.trim());
  const hasHeroContent = hasHeroTitle || hasHeroSubtitle || hasHeroCta;
  const heroTextColor = resolveHeroTextColor(activeSlide?.textColor);
  const heroTextPosition = resolveHeroTextPosition(activeSlide?.textPosition);
  const heroTextAlign = resolveHeroTextAlign(activeSlide?.textPosition);
  const heroActionAlign = heroTextAlign === "text-right" ? "sm:justify-end" : "sm:justify-start";
  const highlightSolutions = useMemo(() => solutions, [solutions]);
  const highlightSoftwares = useMemo(() => softwares, [softwares]);

  if (isLoading) {
    return (
      <div className="grid min-h-[70vh] place-items-center bg-white">
        <div className="grid justify-items-center gap-5 text-center">
          <Image src="/logo.png" alt="AHSO" width={76} height={76} priority />
          <div>
            <p className="text-sm font-semibold text-slate-950">Đang chuẩn bị nội dung AHSO</p>
            <p className="mt-1 text-sm text-slate-500">Vui lòng chờ trong giây lát.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={pageRef} className="bg-transparent text-slate-950">
      {hasHero && activeSlide && (
        <section className="relative h-[clamp(360px,calc(100svh-17rem),700px)] overflow-hidden">
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
                {slide.overlayOn && (
                  <div
                    className="absolute inset-0"
                    style={{ background: resolveHeroOverlayColor(slide.overlayColor) }}
                  />
                )}
              </div>
            ))}
          </div>

          <div
            className={`relative z-10 flex h-full w-full px-4 sm:px-6 lg:px-8 ${heroTextPosition}`}
          >
            {hasHeroContent && (
              <div className={`max-w-[min(52rem,calc(100vw-2rem))] ${heroTextAlign}`}>
                {hasHeroTitle && (
                  <h1
                    data-hero-item
                    className="text-4xl font-semibold leading-[1.05] tracking-normal text-white sm:text-5xl lg:text-7xl"
                    style={{ color: heroTextColor }}
                  >
                    {activeSlide.title}
                  </h1>
                )}
                {hasHeroSubtitle && (
                  <p
                    data-hero-item
                    className="mt-6 max-w-2xl text-base leading-8 text-white/85 sm:text-lg"
                    style={{ color: heroTextColor }}
                  >
                    {activeSlide.subtitle}
                  </p>
                )}
                {hasHeroCta && (
                  <div data-hero-item className={`mt-8 flex flex-col gap-3 sm:flex-row ${heroActionAlign}`}>
                    <Link
                      href={activeSlide.ctaHref!}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-white px-6 text-sm font-semibold text-slate-950 transition hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
                    >
                      {activeSlide.ctaLabel}
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>

          {heroSlides.length > 1 && (
            <div
              className="absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 gap-2"
              aria-label="Chọn ảnh giới thiệu"
            >
              {heroSlides.map((slide, index) => (
                <button
                  key={`${slide.image}-${index}`}
                  type="button"
                  aria-label={`Chuyển đến ảnh giới thiệu ${index + 1}`}
                  onClick={() => setCurrentSlide(index)}
                  className={`h-2 rounded-full transition-all ${
                    currentSlide === index ? "w-8 bg-white" : "w-2 bg-white/50 hover:bg-white/75"
                  }`}
                />
              ))}
            </div>
          )}
        </section>
      )}

      <SiteAnnouncementModal />

      <section className="relative isolate overflow-hidden border-b border-slate-200 bg-white/64 backdrop-blur-[1px]">
        <div className="relative z-10 mx-auto grid max-w-7xl gap-4 px-4 py-4 sm:px-6 md:grid-cols-3 lg:px-8">
          {proofPoints.map((item) => (
            <div key={item.label} data-reveal className="rounded-lg border border-slate-200 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                {item.label}
              </p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">{item.value}</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="relative isolate overflow-hidden bg-white/64 py-16 backdrop-blur-[1px] sm:py-20">
        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-end">
            <div data-reveal>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-700">
                Năng lực AHSO
              </p>
              <h2 className="mt-4 text-3xl font-semibold leading-tight text-slate-950 sm:text-5xl">
                Hiểu đúng bài toán công nghiệp trước khi đề xuất giải pháp.
              </h2>
            </div>
            <p data-reveal className="text-base leading-8 text-slate-600 lg:text-lg">
              AHSO tập trung vào các giải pháp và phần mềm phục vụ vận hành công nghiệp:
              rõ nhu cầu, rõ phương án, rõ giá trị triển khai. Website này giúp khách hàng
              nhanh chóng xem năng lực, tham khảo nội dung phù hợp và gửi yêu cầu tư vấn.
            </p>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {capabilities.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  data-reveal
                  className="rounded-lg border border-slate-200 bg-white p-6 transition duration-300 hover:-translate-y-1 hover:border-slate-300"
                >
                  <div className="mb-8 flex h-11 w-11 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-950">{item.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{item.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="relative isolate overflow-hidden bg-slate-50/68 py-16 backdrop-blur-[1px] sm:py-20">
        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div data-reveal>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-700">
                Giải pháp
              </p>
              <h2 className="mt-3 text-3xl font-semibold text-slate-950 sm:text-4xl">
                Giải pháp nổi bật
              </h2>
            </div>
            <Link
              href="/solutions"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-950 transition hover:border-slate-400 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
            >
              Xem tất cả giải pháp
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {highlightSolutions.length > 0 ? (
            <div data-reveal>
              <FeaturedSolutionsShowcase items={highlightSolutions} />
            </div>
          ) : (
            <EmptyShowcase label="giải pháp" />
          )}
        </div>
      </section>

      <section
        ref={softwareSectionRef}
        className="relative isolate overflow-hidden bg-white/64 py-16 backdrop-blur-[1px] sm:py-20"
      >
        <div className="relative z-10 mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:min-h-[calc(100svh-4rem)] lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:px-8">
          <div data-reveal className="lg:sticky lg:top-24 lg:self-start">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-700">
              Phần mềm
            </p>
            <h2 className="mt-3 text-3xl font-semibold text-slate-950 sm:text-4xl">
              Công cụ số giúp vận hành rõ ràng và nhanh hơn.
            </h2>
            <p className="mt-4 text-base leading-8 text-slate-600">
              Các phần mềm được trình bày ngắn gọn để người xem hiểu mục đích,
              phạm vi ứng dụng và biết khi nào cần trao đổi với AHSO.
            </p>
            <Link
              href="/software"
              className="mt-6 inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 text-sm font-semibold text-white transition hover:bg-blue-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
            >
              Xem phần mềm
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {highlightSoftwares.length > 0 ? (
            <div
              ref={softwareViewportRef}
              className="overflow-hidden lg:max-h-[calc(100svh-8rem)]"
              role="region"
              aria-label="Danh sách phần mềm nổi bật"
            >
              <div ref={softwareTrackRef} className="grid gap-5">
                {highlightSoftwares.map((item) => (
                  <div key={item.id} data-reveal>
                    <FeaturedContentCard item={item} />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <EmptyShowcase label="phần mềm" />
          )}
        </div>
      </section>

      <section className="border-y border-slate-200 bg-slate-950 py-16 text-white sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
            <div data-reveal>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-200">
                Quy trình làm việc
              </p>
              <h2 className="mt-3 text-3xl font-semibold sm:text-4xl">
                Ít bước hơn, nhưng mỗi bước phải rõ ràng.
              </h2>
              <p className="mt-4 text-base leading-8 text-slate-300">
                AHSO không phóng đại khả năng. Mỗi yêu cầu cần được làm rõ trước khi
                tư vấn, báo giá hoặc đề xuất phương án triển khai.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {processSteps.map((step, index) => (
                <div
                  key={step}
                  data-reveal
                  className="rounded-lg border border-white/10 bg-white/5 p-5"
                >
                  <span className="text-sm font-semibold text-blue-200">
                    0{index + 1}
                  </span>
                  <p className="mt-3 text-lg font-semibold">{step}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="relative isolate overflow-hidden bg-white/64 py-16 backdrop-blur-[1px] sm:py-20">
        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div
            data-reveal
            className="grid gap-8 rounded-lg border border-slate-200 bg-slate-50 p-6 sm:p-8 lg:grid-cols-[1fr_auto] lg:items-center"
          >
            <div>
              <div className="mb-4 flex items-center gap-3 text-sm font-semibold text-blue-700">
                <BadgeCheck className="h-5 w-5" />
                Sẵn sàng trao đổi khi bạn có nhu cầu cụ thể
              </div>
              <h2 className="text-3xl font-semibold text-slate-950 sm:text-4xl">
                Cần tư vấn giải pháp, phần mềm hoặc báo giá?
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-8 text-slate-600">
                Gửi yêu cầu để đội ngũ AHSO nắm bối cảnh, phản hồi đúng trọng tâm và
                đề xuất bước tiếp theo phù hợp.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
              <Link
                href="/contact"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-blue-700 px-5 text-sm font-semibold text-white transition hover:bg-blue-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
              >
                <Phone className="h-4 w-4" />
                Liên hệ tư vấn
              </Link>
              <Link
                href={SHOP_URL}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-950 transition hover:border-slate-400 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
              >
                <Building2 className="h-4 w-4" />
                Sang trang sản phẩm
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
