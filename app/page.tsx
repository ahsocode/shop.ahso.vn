"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings, Wrench, TrendingUp, Shield, Clock, Award } from "lucide-react";

export default function Home() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
     
      gsap.from(".hero-title", {
        y: 50,
        opacity: 0,
        duration: 1,
        ease: "power3.out",
      });
      gsap.from(".hero-description", {
        y: 30,
        opacity: 0,
        duration: 1,
        delay: 0.2,
        ease: "power3.out",
      });
      gsap.from(".hero-buttons", {
        y: 30,
        opacity: 0,
        duration: 1,
        delay: 0.4,
        ease: "power3.out",
      });

      gsap.utils.toArray<HTMLElement>(".feature-card").forEach((card, i) => {
        const icon = card.querySelector(".feature-icon");

        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: card,
            start: "top 85%",
            toggleActions: "play none none none",
            once: true,
          },
          defaults: { ease: "power3.out" },
        });

        tl.fromTo(
          card,
          { y: 60, autoAlpha: 0, scale: 0.96, rotateX: -8, transformOrigin: "50% 100%" },
          { y: 0, autoAlpha: 1, scale: 1, rotateX: 0, duration: 0.6 }
        )
          .fromTo(
            icon,
            { scale: 0.6, autoAlpha: 0, y: 8 },
            { scale: 1, autoAlpha: 1, y: 0, duration: 0.35 },
            "-=0.2"
          );

        tl.delay(i * 0.05);
      });

      const cards = gsap.utils.toArray<HTMLElement>(".feature-card");
      cards.forEach((el) => {
        el.addEventListener("mouseenter", () => {
          gsap.to(el, { y: -4, duration: 0.25, ease: "power2.out" });
        });
        el.addEventListener("mouseleave", () => {
          gsap.to(el, { y: 0, duration: 0.3, ease: "power2.out" });
        });
      });
    }, rootRef);

    return () => ctx.revert();
  }, []);

  const features = [
    { icon: Settings, title: "Máy móc công nghiệp", description: "Máy móc hiện đại, hiệu suất cao cho mọi quy mô sản xuất" },
    { icon: Wrench, title: "Phụ tùng thay thế", description: "Linh kiện chính hãng, tương thích hoàn hảo với thiết bị" },
    { icon: Shield, title: "Bảo hành chính hãng", description: "Cam kết chất lượng với chính sách bảo hành toàn diện" },
    { icon: Clock, title: "Giao hàng nhanh", description: "Vận chuyển toàn quốc, giao hàng nhanh chóng" },
    { icon: TrendingUp, title: "Tư vấn chuyên nghiệp", description: "Đội ngũ kỹ thuật giàu kinh nghiệm hỗ trợ 24/7" },
    { icon: Award, title: "Giá cả cạnh tranh", description: "Giá tốt nhất thị trường với nhiều ưu đãi hấp dẫn" },
  ];

  const categories = [
    { name: "Máy công nghiệp", count: 150, image: "🏭" },
    { name: "Linh kiện điện", count: 320, image: "⚡" },
    { name: "Dụng cụ đo", count: 95, image: "📏" },
    { name: "Phụ tùng", count: 280, image: "🔧" },
  ];

  return (
    <div ref={rootRef}>
      {/* Hero Section */}
      <section className="relative bg-linear-to-br from-blue-600 to-blue-800 text-white overflow-hidden">
        <div className="absolute inset-0 bg-grid-white/10"></div>
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-24 md:py-32">
          <div className="max-w-3xl">
            <h1 className="hero-title text-4xl md:text-6xl font-bold mb-6 leading-tight">
              Giải pháp máy móc công nghiệp toàn diện
            </h1>
            <p className="hero-description text-xl md:text-2xl mb-8 text-blue-100">
              Cung cấp thiết bị, máy móc và linh kiện công nghiệp chất lượng cao với giá cạnh tranh nhất thị trường
            </p>
            <div className="hero-buttons flex flex-wrap gap-4">
              <Link href="/shop">
                <Button size="lg" className="bg-white text-blue-600 hover:bg-gray-100 shadow-lg">
                  Khám phá sản phẩm
                </Button>
              </Link>
              <Button size="lg" className="bg-white text-blue-600 hover:bg-gray-100 shadow-lg">
                Liên hệ tư vấn
              </Button>
            </div>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute top-20 right-10 w-72 h-72 bg-blue-500/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 left-10 w-96 h-96 bg-blue-400/20 rounded-full blur-3xl"></div>
      </section>

      {/* Categories Section */}
      <section className="py-16 bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Danh mục sản phẩm</h2>
            <p className="text-lg text-gray-600">Hàng nghìn sản phẩm đa dạng cho mọi nhu cầu</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {categories.map((category, index) => (
              <Card key={index} className="hover:shadow-lg transition-all duration-300 cursor-pointer group">
                <CardContent className="p-6 text-center">
                  <div className="text-5xl mb-4 group-hover:scale-110 transition-transform">{category.image}</div>
                  <h3 className="font-semibold text-lg mb-2">{category.name}</h3>
                  <p className="text-sm text-gray-500">{category.count} sản phẩm</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Tại sao chọn chúng tôi?</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Chúng tôi cam kết mang đến giải pháp tốt nhất cho doanh nghiệp của bạn
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card
                  key={index}
                  className="feature-card hover:shadow-xl transition-all duration-300 border-t-4 border-t-blue-600 opacity-0"
                >
                  <CardHeader>
                    <div className="feature-icon w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                      <Icon className="h-6 w-6 text-blue-600" />
                    </div>
                    <CardTitle className="text-xl">{feature.title}</CardTitle>
                    <CardDescription className="text-base">{feature.description}</CardDescription>
                  </CardHeader>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

     
      <section className="bg-blue-600 text-white py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">Sẵn sàng nâng cấp dây chuyền sản xuất?</h2>
          <p className="text-xl mb-8 text-blue-100 max-w-2xl mx-auto">
            Liên hệ ngay để được tư vấn miễn phí và nhận ưu đãi đặc biệt
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Button size="lg" className="bg-white text-blue-600 hover:bg-gray-100">
              Liên hệ ngay
            </Button>
            <Button size="lg" variant="outline" className="bg-white text-blue-600 hover:bg-gray-100">
              Xem thêm
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
