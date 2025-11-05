"use client";

import { useEffect, useRef, useState } from "react";
import { Settings, Wrench, TrendingUp, Shield, Clock, Award, ChevronLeft, ChevronRight, Zap, Ruler, Cog, Phone, ArrowRight, Package, Headphones, BadgeCheck } from "lucide-react";

export default function Home() {
  const rootRef = useRef(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  
  const heroImages = [
    "/factory1.jpg",
    "/factory2.jpg", 
    "/factory3.jpg",
    "/factory4.jpg"
  ];

  // Auto-play carousel
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroImages.length);
    }, 4000);
    
    return () => clearInterval(interval);
  }, []);

  const features = [
    { 
      icon: Settings, 
      title: "Máy móc công nghiệp", 
      description: "Máy móc hiện đại, hiệu suất cao cho mọi quy mô sản xuất",
      color: "from-blue-500 to-blue-600"
    },
    { 
      icon: Wrench, 
      title: "Phụ tùng thay thế", 
      description: "Linh kiện chính hãng, tương thích hoàn hảo với thiết bị",
      color: "from-purple-500 to-purple-600"
    },
    { 
      icon: BadgeCheck, 
      title: "Bảo hành chính hãng", 
      description: "Cam kết chất lượng với chính sách bảo hành toàn diện",
      color: "from-green-500 to-green-600"
    },
    { 
      icon: Clock, 
      title: "Giao hàng nhanh", 
      description: "Vận chuyển toàn quốc, giao hàng nhanh chóng",
      color: "from-orange-500 to-orange-600"
    },
    { 
      icon: Headphones, 
      title: "Tư vấn chuyên nghiệp", 
      description: "Đội ngũ kỹ thuật giàu kinh nghiệm hỗ trợ 24/7",
      color: "from-red-500 to-red-600"
    },
    { 
      icon: Award, 
      title: "Giá cả cạnh tranh", 
      description: "Giá tốt nhất thị trường với nhiều ưu đãi hấp dẫn",
      color: "from-yellow-500 to-yellow-600"
    },
  ];

  const categories = [
    { 
      name: "Máy công nghiệp", 
      count: 150, 
      icon: Cog,
      image: "/factory1.jpg",
      gradient: "from-blue-500 to-cyan-500"
    },
    { 
      name: "Linh kiện điện", 
      count: 320, 
      icon: Zap,
      image: "/linhkien1.jpg",
      gradient: "from-purple-500 to-pink-500"
    },
    { 
      name: "Dụng cụ đo", 
      count: 95, 
      icon: Ruler,
      image: "/thietbido1.jpg",
      gradient: "from-green-500 to-emerald-500"
    },
    { 
      name: "Phụ tùng", 
      count: 280, 
      icon: Package,
      image: "/linhkien1.jpg",
      gradient: "from-orange-500 to-red-500"
    },
  ];

  return (
    <div ref={rootRef} className="min-h-screen bg-gray-50">
      {/* Hero Section with Image Carousel */}
      <section className="relative h-[600px] md:h-[700px] overflow-hidden">
        {/* Image Carousel */}
        <div className="absolute inset-0">
          {heroImages.map((img, index) => (
            <div
              key={index}
              className="absolute inset-0 transition-opacity duration-1000 ease-in-out"
              style={{
                opacity: currentSlide === index ? 1 : 0,
                backgroundImage: `url(${img})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              }}
            >
              {/* Overlay */}
              <div className="absolute inset-0 bg-linear-to-r from-blue-900/90 via-blue-800/70 to-transparent"></div>
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="relative z-10 h-full flex items-center">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 w-full">
            <div className="max-w-3xl">
              <div className="inline-block mb-4 px-4 py-2 bg-blue-500/20 backdrop-blur-sm rounded-full border border-blue-400/30">
                <span className="text-blue-200 text-sm font-medium">🏭 Giải pháp công nghiệp hàng đầu</span>
              </div>
              
              <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight text-white animate-fade-in">
                Giải pháp máy móc công nghiệp toàn diện
              </h1>
              
              <p className="text-xl md:text-2xl mb-8 text-blue-100 animate-fade-in-delay">
                Cung cấp thiết bị, máy móc và linh kiện công nghiệp chất lượng cao với giá cạnh tranh nhất thị trường
              </p>
              
              <div className="flex flex-wrap gap-4 animate-fade-in-delay-2">
                <button className="group px-8 py-4 bg-white text-blue-600 rounded-lg font-semibold shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 flex items-center gap-2">
                  Khám phá sản phẩm
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
                <button className="px-8 py-4 bg-blue-500/20 backdrop-blur-sm text-white rounded-lg font-semibold border-2 border-white/30 hover:bg-blue-500/30 hover:scale-105 transition-all duration-300 flex items-center gap-2">
                  <Phone className="w-5 h-5" />
                  Liên hệ tư vấn
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Carousel Indicators */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-20 flex gap-2">
          {heroImages.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`h-2 rounded-full transition-all duration-300 ${
                currentSlide === index ? 'w-8 bg-white' : 'w-2 bg-white/50'
              }`}
            />
          ))}
        </div>

        {/* Decorative Elements */}
        <div className="absolute top-20 right-10 w-72 h-72 bg-blue-500/30 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 left-10 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
      </section>

      {/* Categories Section */}
      <section className="py-20 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Danh mục sản phẩm</h2>
            <p className="text-lg text-gray-600">Hàng nghìn sản phẩm đa dạng cho mọi nhu cầu</p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {categories.map((category, index) => {
              const Icon = category.icon;
              return (
                <div
                  key={index}
                  className="group relative overflow-hidden rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 cursor-pointer"
                >
                  {/* Background Image */}
                  <div 
                    className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
                    style={{backgroundImage: `url(${category.image})`}}
                  />
            
                  {/* Gradient Overlay */}
                  <div className={`absolute inset-0 bg-linear-to-br ${category.gradient} opacity-55 group-hover:opacity-70 transition-opacity duration-300`}></div>
                  
                  {/* Content */}
                  <div className="relative p-8 text-white h-64 flex flex-col justify-between">
                    <div>
                      <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
                        <Icon className="w-8 h-8" />
                      </div>
                      <h3
                        className="text-2xl font-bold mb-2 text-white"
                        style={{ textShadow: "2px 2px 4px rgba(0,0,0,0.8)" }}
                      >
                        {category.name}
                      </h3>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-semibold">{category.count} sản phẩm</span>
                      <ArrowRight className="w-6 h-6 transform translate-x-0 group-hover:translate-x-2 transition-transform duration-300" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-linear-to-br from-gray-50 to-blue-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Tại sao chọn chúng tôi?</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Chúng tôi cam kết mang đến giải pháp tốt nhất cho doanh nghiệp của bạn
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div
                  key={index}
                  className="group relative bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2"
                  style={{animationDelay: `${index * 100}ms`}}
                >
                  
                  
                  {/* Icon */}
                  <div className={`w-16 h-16 rounded-xl bg-linear-to-br ${feature.color} flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 shadow-lg`}>
                    <Icon className="w-8 h-8 text-white" />
                  </div>
                  
                  {/* Content */}
                  <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-linear-to-r group-hover:from-blue-600 group-hover:to-purple-600 transition-all duration-300">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    {feature.description}
                  </p>
                  
                  {/* Hover Arrow */}
                  <div className="mt-4 flex items-center text-blue-600 opacity-0 group-hover:opacity-100 transition-all duration-300">
                    <span className="text-sm font-semibold mr-2">Tìm hiểu thêm</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-2 transition-transform duration-300" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-24 overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-linear-to-br from-blue-600 via-blue-700 to-purple-700"></div>
        <div className="absolute inset-0 opacity-10" style={{backgroundImage: 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23ffffff" fill-opacity="1"%3E%3Cpath d="M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")'}}></div>
        
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center text-white">
            
              
            
            
            <h2 className="text-3xl md:text-5xl font-bold mb-6">
              Sẵn sàng nâng cấp dây chuyền sản xuất?
            </h2>
            
            <p className="text-xl mb-10 text-blue-100 max-w-2xl mx-auto">
              Liên hệ ngay để được tư vấn miễn phí và nhận ưu đãi đặc biệt
            </p>
            
            <div className="flex flex-wrap gap-4 justify-center">
              <button className="group px-8 py-4 bg-white text-blue-600 rounded-lg font-bold shadow-2xl hover:shadow-3xl hover:scale-105 transition-all duration-300 flex items-center gap-2">
                <Phone className="w-5 h-5" />
                Liên hệ ngay
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
              <button className="px-8 py-4 bg-white/10 backdrop-blur-sm text-white rounded-lg font-bold border-2 border-white/30 hover:bg-white/20 hover:scale-105 transition-all duration-300">
                Xem thêm sản phẩm
              </button>
            </div>
          </div>
        </div>

        {/* Decorative Elements */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500/30 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-500/30 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1.5s'}}></div>
      </section>

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.8s ease-out;
        }

        .animate-fade-in-delay {
          animation: fade-in 0.8s ease-out 0.2s backwards;
        }

        .animate-fade-in-delay-2 {
          animation: fade-in 0.8s ease-out 0.4s backwards;
        }
      `}</style>
    </div>
  );
}