"use client";

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

export default function HomePageClient() {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);

  const heroSlides = [
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

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [heroSlides.length]);

  useEffect(() => {
    const els = Array.from(
      document.querySelectorAll<HTMLElement>("[data-reveal]")
    );
    if (!("IntersectionObserver" in window) || els.length === 0) return;

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          const el = e.target as HTMLElement;
          if (e.isIntersecting) {
            el.classList.add("is-visible");
            io.unobserve(el);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -10% 0px" }
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

  return (
    <div ref={rootRef} className="min-h-screen bg-gray-50">
      {/* Hero */}
      <section className="relative h-[600px] md:h-[700px] overflow-hidden">
        {/* Image Carousel */}
        <div className="absolute inset-0">
          {heroSlides.map((slide, index) => (
            <div
              key={index}
              className="absolute inset-0 transition-opacity duration-1000 ease-in-out"
              style={{
                opacity: currentSlide === index ? 1 : 0,
                backgroundImage: `url(${slide.image})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            >
              <div className="absolute inset-0 bg-linear-to-r from-blue-900/90 via-blue-800/70 to-transparent"></div>
            </div>
          ))}
        </div>

        {/* Text Content */}
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
                {heroSlides[currentSlide].title}
              </h1>

              <p className="text-xl md:text-2xl mb-8 text-blue-100 animate-fade-in-delay">
                {heroSlides[currentSlide].subtitle}
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
                  <Phone className="w-5 h-5" />
                  Liên hệ tư vấn
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Indicators */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-3">
          {heroSlides.map((_, index) => (
            <button
              key={index}
              className={`w-3 h-3 rounded-full transition-all duration-300 ${
                currentSlide === index
                  ? "bg-white scale-110"
                  : "bg-white/40 hover:bg-white/60"
              }`}
              onClick={() => setCurrentSlide(index)}
              aria-label={`Slide ${index + 1}`}
            />
          ))}
        </div>
      </section>

      {/* Category Cards */}
      <section className="py-16 bg-white" data-reveal>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="text-sm font-semibold text-blue-600 mb-2">
              Hệ sinh thái AHSO
            </p>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Giải pháp toàn diện cho doanh nghiệp
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Từ thiết bị, phần mềm đến dịch vụ triển khai – chúng tôi cung cấp
              trọn vẹn chuỗi giá trị trong một hệ sinh thái đồng bộ.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {categories.map((category, index) => {
              const Icon = category.icon;
              return (
                <div
                  key={category.name}
                  className="relative rounded-3xl overflow-hidden bg-gray-900 text-white shadow-xl group hover:-translate-y-2 transition-all duration-300"
                  data-reveal
                  style={withRevealDelay(`${index * 120}ms`)}
                >
                  <div
                    className={`absolute inset-0 bg-linear-to-br ${category.gradient} opacity-90`}
                  ></div>
                  <div className="relative z-10 p-8">
                    <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center mb-6">
                      <Icon className="w-6 h-6" />
                    </div>
                    <h3 className="text-2xl font-bold mb-4">{category.name}</h3>
                    <p className="text-white/80 mb-6">
                      {category.countLabel}
                    </p>
                    <Link
                      href={category.href}
                      className="inline-flex items-center gap-2 text-sm font-semibold text-white"
                    >
                      Khám phá ngay
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </div>
                  <div
                    className="absolute inset-0 opacity-40"
                    style={{ backgroundImage: `url(${category.image})` }}
                  ></div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16 bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 hover:border-blue-100 hover:shadow-xl transition-all duration-300"
                  data-reveal
                  style={withRevealDelay(`${index * 70}ms`)}
                >
                  <div
                    className={`w-14 h-14 rounded-2xl bg-linear-to-br ${feature.color} flex items-center justify-center text-white mb-4`}
                  >
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
