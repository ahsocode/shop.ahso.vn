"use client";

import { useEffect, useRef } from "react";
import { withRevealDelay } from "@/lib/reveal";
import {
  Award, Package, Settings, Factory, Shield, Users, CheckCircle, Sparkles,
  Target, Zap, Cog, BadgeCheck, Clock, Truck, Handshake, Brain, Cpu,
  Globe, Lightbulb, Mail, MapPin, Link as LinkIcon,
} from "lucide-react";
import Link from "next/link";

export default function AboutPage() {
  // Giữ cơ chế cũ cho section lớn:
  const sectionsRef = useRef<HTMLElement[]>([]);

  useEffect(() => {
    // ---- Observer cho .reveal (section lớn – hiệu ứng slide/opacity của bạn) ----
    const sectionObserver = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("animate-in");
            // chỉ chạy 1 lần; muốn lặp lại thì bỏ comment 2 dòng dưới:
            // sectionObserver.unobserve(entry.target);
            // entry.target.classList.remove("animate-in");
          }
        }),
      { threshold: 0.2, rootMargin: "0px 0px -100px 0px" }
    );

    sectionsRef.current.forEach((section) => section && sectionObserver.observe(section));

    // ---- Observer cho [data-reveal] (item nhỏ – fade-up + stagger) ----
    const itemObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          const el = e.target as HTMLElement;
          if (e.isIntersecting) {
            el.classList.add("is-visible");
            itemObserver.unobserve(el); // chạy 1 lần; muốn lặp lại thì comment dòng này và dùng else để remove
          }
          // Repeat-mode (tuỳ chọn):
          // else {
          //   el.classList.remove("is-visible");
          // }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -10% 0px" }
    );

    const revealItems = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
    revealItems.forEach((el) => itemObserver.observe(el));

    return () => {
      sectionObserver.disconnect();
      itemObserver.disconnect();
    };
  }, []);

  const addToRefs = (el: HTMLElement | null) => {
    if (el && !sectionsRef.current.includes(el)) {
      sectionsRef.current.push(el);
    }
  };

  const coreValues = [
    { icon: Target, title: "Hiệu quả", desc: "Luôn đặt giá trị thực tiễn và hiệu suất lên hàng đầu" },
    { icon: Lightbulb, title: "Đổi mới", desc: "Không ngừng sáng tạo, cập nhật công nghệ tiên tiến" },
    { icon: Users, title: "Đồng hành", desc: "Hợp tác lâu dài, lắng nghe và hỗ trợ khách hàng sát sao" },
    { icon: Globe, title: "Bền vững", desc: "Tối ưu không chỉ trong ngắn hạn mà hướng đến tương lai" },
  ];

  return (
    <div className="min-h-screen bg-linear-to-b from-white to-gray-50">
      {/* Hero Section */}
      <section ref={addToRefs} className="relative min-h-screen flex items-center justify-center overflow-hidden reveal">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: 'url(/factory1.jpg)' }}>
          <div className="absolute inset-0 bg-linear-to-br from-blue-900/95 via-blue-800/90 to-purple-900/95"></div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-white py-20">
          <div className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 backdrop-blur-sm rounded-full border border-white/20 mb-8" data-reveal>
            <Sparkles className="w-5 h-5 text-yellow-300" />
            <span className="text-sm font-semibold">Đối tác tin cậy của hàng nghìn doanh nghiệp</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold mb-8 leading-tight" data-reveal style={withRevealDelay("80ms")}>
            Về <span className="text-transparent bg-clip-text bg-linear-to-r from-blue-300 to-purple-300">AHSO</span>
          </h1>

          <p className="text-xl md:text-2xl text-blue-100 max-w-4xl mx-auto mb-12 leading-relaxed" data-reveal style={withRevealDelay("160ms")}>
            AHSO – viết tắt của Automation - High Solution - Optimization – là doanh nghiệp tiên phong cung cấp các 
            giải pháp công nghệ toàn diện trong lĩnh vực tự động hóa, chuyển đổi số, phần mềm doanh nghiệp và trí tuệ nhân tạo (AI).
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
            {[
              { icon: Factory, number: "5+", label: "Năm kinh nghiệm" },
              { icon: Users, number: "5000+", label: "Khách hàng tin dùng" },
              { icon: Package, number: "10000+", label: "Sản phẩm đa dạng" },
              { icon: Award, number: "99%", label: "Hài lòng" },
            ].map((stat, idx) => {
              const Icon = stat.icon;
              return (
                <div key={idx} className="group" data-reveal style={withRevealDelay(`${idx * 90}ms`)}>
                  <div className="w-16 h-16 mx-auto mb-4 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <Icon className="w-8 h-8" />
                  </div>
                  <div className="text-4xl font-bold mb-2">{stat.number}</div>
                  <div className="text-blue-200 text-sm">{stat.label}</div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-32 bg-linear-to-t from-white to-transparent"></div>
      </section>

      {/* AHSO Introduction - NEW SECTION */}
      <section ref={addToRefs} className="py-20 bg-white reveal">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16" data-reveal>
            <div className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600/10 rounded-full mb-6" data-reveal>
              <Brain className="w-6 h-6 text-blue-700" />
              <span className="text-lg font-bold text-blue-900">Giới Thiệu Về AHSO</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6" data-reveal style={withRevealDelay("60ms")}>
              Automation – High Solution – Optimization
            </h2>
            <p className="text-xl text-gray-700 max-w-4xl mx-auto" data-reveal style={withRevealDelay("120ms")}>
              AHSO là doanh nghiệp tiên phong cung cấp <strong>giải pháp công nghệ toàn diện</strong> trong lĩnh vực tự động hóa, chuyển đổi số, phần mềm doanh nghiệp và trí tuệ nhân tạo (AI).
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-16">
            {[
              {
                box: "from-blue-50 to-blue-100",
                iconBox: "bg-blue-600",
                icon: Cpu,
                title: "Tự Động Hóa Công Nghiệp",
                desc: "Thiết kế, tích hợp hệ thống tự động hóa dây chuyền, giám sát thông minh, tăng năng suất, giảm chi phí.",
              },
              {
                box: "from-purple-50 to-purple-100",
                iconBox: "bg-purple-600",
                icon: Globe,
                title: "Chuyển Đổi Số Doanh Nghiệp",
                desc: "Tư vấn và triển khai ERP, MES, quản trị nội bộ, sản xuất, phân phối – minh bạch và hiệu quả.",
              },
              {
                box: "from-emerald-50 to-emerald-100",
                iconBox: "bg-emerald-600",
                icon: Brain,
                title: "Phần Mềm & AI",
                desc: "Phát triển phần mềm quản lý, AI Vision, dữ liệu lớn, phân tích dự đoán – tối ưu hóa vận hành.",
              },
            ].map((c, i) => {
              const Icon = c.icon;
              return (
                <div
                  key={i}
                  className={`bg-linear-to-br ${c.box} rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300`}
                  data-reveal
                  style={withRevealDelay(`${i * 100}ms`)}
                >
                  <div className={`w-14 h-14 ${c.iconBox} rounded-xl flex items-center justify-center mb-5`}>
                    <Icon className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">{c.title}</h3>
                  <p className="text-gray-700">{c.desc}</p>
                </div>
              );
            })}
          </div>

          <div className="grid md:grid-cols-2 gap-8 mb-16">
            {[
              {
                icon: Target, title: "Tầm nhìn",
                desc: "Trở thành đơn vị công nghệ hàng đầu khu vực trong lĩnh vực tự động hóa & trí tuệ nhân tạo ứng dụng, đồng hành cùng doanh nghiệp Việt trên hành trình chuyển mình số hóa.",
                box: "from-indigo-600 to-purple-700",
              },
              {
                icon: Lightbulb, title: "Sứ mệnh",
                desc: "Mang đến các giải pháp công nghệ tối ưu, dễ triển khai và linh hoạt, giúp khách hàng tăng hiệu quả, giảm rủi ro và phát triển bền vững.",
                box: "from-teal-600 to-emerald-700",
              },
            ].map((b, idx) => {
              const Icon = b.icon;
              return (
                <div key={idx} className={`bg-linear-to-br ${b.box} rounded-2xl p-8 text-white`} data-reveal style={withRevealDelay(`${idx * 100}ms`)}>
                  <Icon className="w-12 h-12 mb-5" />
                  <h3 className="text-2xl font-bold mb-3">{b.title}</h3>
                  <p className="text-lg">{b.desc}</p>
                </div>
              );
            })}
          </div>

          <div className="bg-gray-50 rounded-3xl p-10 shadow-xl" data-reveal>
            <h3 className="text-2xl font-bold text-gray-900 mb-8 text-center">Giá Trị Cốt Lõi</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {coreValues.map((value, i) => {
                const Icon = value.icon;
                return (
                  <div key={i} className="text-center group" data-reveal style={withRevealDelay(`${i * 80}ms`)}>
                    <div className="w-16 h-16 mx-auto bg-blue-600/10 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
                      <Icon className="w-8 h-8 text-blue-700 group-hover:text-white" />
                    </div>
                    <h4 className="font-bold text-gray-900 mb-2">{value.title}</h4>
                    <p className="text-sm text-gray-600">{value.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Đa dạng linh kiện */}
      <section ref={addToRefs} className="py-24 reveal">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-100 rounded-full" data-reveal>
                <Package className="w-5 h-5 text-purple-600" />
                <span className="text-sm font-semibold text-purple-600">Đa dạng sản phẩm</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900" data-reveal style={withRevealDelay("60ms")}>
                Hàng nghìn linh kiện <span className="text-transparent bg-clip-text bg-linear-to-r from-purple-600 to-pink-600">chất lượng cao</span>
              </h2>
              <p className="text-lg text-gray-600 leading-relaxed" data-reveal style={withRevealDelay("120ms")}>
                Chúng tôi tự hào sở hữu kho linh kiện phong phú với hơn 10,000 sản phẩm từ các thương hiệu uy tín trên thế giới.
              </p>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { icon: Zap, title: "Linh kiện điện", count: "3000+" },
                  { icon: Cog, title: "Phụ tùng máy", count: "2500+" },
                  { icon: Shield, title: "Thiết bị an toàn", count: "1500+" },
                  { icon: Target, title: "Cảm biến", count: "3000+" },
                ].map((item, idx) => {
                  const Icon = item.icon;
                  return (
                    <div key={idx} className="flex items-start gap-3 p-4 bg-white rounded-xl shadow-md hover:shadow-xl transition-shadow duration-300" data-reveal style={withRevealDelay(`${idx * 80}ms`)}>
                      <div className="w-12 h-12 bg-linear-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center shrink-0">
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <div className="font-bold text-gray-900">{item.title}</div>
                        <div className="text-sm text-purple-600 font-semibold">{item.count} sản phẩm</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="relative" data-reveal style={withRevealDelay("80ms")}>
              <div className="aspect-square rounded-3xl overflow-hidden shadow-2xl">
                <div className="w-full h-full bg-cover bg-center transform hover:scale-105 transition-transform duration-700" style={{ backgroundImage: 'url(/linhkien1.jpg)' }}></div>
              </div>
              <div className="absolute -bottom-6 -right-6 w-72 h-72 bg-linear-to-br from-purple-400 to-pink-400 rounded-3xl opacity-20 blur-3xl -z-10"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Đa dạng máy móc */}
      <section ref={addToRefs} className="py-24 bg-linear-to-br from-blue-50 to-purple-50 reveal">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="relative order-2 md:order-1" data-reveal>
              <div className="aspect-square rounded-3xl overflow-hidden shadow-2xl">
                <div className="w-full h-full bg-cover bg-center transform hover:scale-105 transition-transform duration-700" style={{ backgroundImage: 'url(/factory2.jpg)' }}></div>
              </div>
              <div className="absolute -top-6 -left-6 w-72 h-72 bg-linear-to-br from-blue-400 to-cyan-400 rounded-3xl opacity-20 blur-3xl -z-10"></div>
            </div>
            <div className="space-y-6 order-1 md:order-2">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 rounded-full" data-reveal>
                <Settings className="w-5 h-5 text-blue-600" />
                <span className="text-sm font-semibold text-blue-600">Máy móc hiện đại</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900" data-reveal style={withRevealDelay("60ms")}>
                Thiết bị công nghiệp <span className="text-transparent bg-clip-text bg-linear-to-r from-blue-600 to-cyan-600">hàng đầu</span>
              </h2>
              <p className="text-lg text-gray-600 leading-relaxed" data-reveal style={withRevealDelay("120ms")}>
                Từ máy CNC, máy tiện, dây chuyền tự động đến thiết bị đo kiểm – giải pháp toàn diện cho mọi nhà máy.
              </p>
              <div className="space-y-4">
                {[
                  { icon: Factory, title: "Máy CNC & Máy tiện", desc: "Độ chính xác cao, hiệu suất vượt trội" },
                  { icon: Cog, title: "Dây chuyền sản xuất", desc: "Tự động hóa hoàn toàn, tiết kiệm chi phí" },
                  { icon: Settings, title: "Thiết bị đo kiểm", desc: "Đảm bảo chất lượng sản phẩm tối đa" },
                ].map((item, idx) => {
                  const Icon = item.icon;
                  return (
                    <div key={idx} className="flex items-start gap-4 p-5 bg-white rounded-xl shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300" data-reveal style={withRevealDelay(`${idx * 90}ms`)}>
                      <div className="w-14 h-14 bg-linear-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center shrink-0">
                        <Icon className="w-7 h-7 text-white" />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg text-gray-900 mb-1">{item.title}</h3>
                        <p className="text-gray-600">{item.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Dịch vụ tận tâm */}
      <section ref={addToRefs} className="py-24 reveal">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 rounded-full" data-reveal>
                <Handshake className="w-5 h-5 text-green-600" />
                <span className="text-sm font-semibold text-green-600">Dịch vụ tận tâm</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900" data-reveal style={withRevealDelay("60ms")}>
                Đồng hành cùng <span className="text-transparent bg-clip-text bg-linear-to-r from-green-600 to-emerald-600">sự phát triển</span>
              </h2>
              <p className="text-lg text-gray-600 leading-relaxed" data-reveal style={withRevealDelay("120ms")}>
                Đội ngũ kỹ sư và chuyên gia của chúng tôi luôn sẵn sàng hỗ trợ 24/7. Từ tư vấn, lắp đặt đến bảo trì – chúng tôi đồng hành trọn vẹn.
              </p>
              <div className="bg-linear-to-br from-green-50 to-emerald-50 rounded-2xl p-6 space-y-4">
                {[
                  { icon: Users, title: "Đội ngũ chuyên nghiệp", desc: "Kỹ sư giàu kinh nghiệm, tư vấn tận tình" },
                  { icon: Handshake, title: "Hỗ trợ 24/7", desc: "Sẵn sàng giải quyết mọi vấn đề kỹ thuật" },
                  { icon: Target, title: "Giải pháp tối ưu", desc: "Tùy chỉnh theo nhu cầu từng khách hàng" },
                ].map((item, idx) => {
                  const Icon = item.icon;
                  return (
                    <div key={idx} className="flex items-center gap-4" data-reveal style={withRevealDelay(`${idx * 90}ms`)}>
                      <div className="w-12 h-12 bg-linear-to-br from-green-500 to-emerald-500 rounded-lg flex items-center justify-center shrink-0">
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-gray-900">{item.title}</h4>
                        <p className="text-sm text-gray-600">{item.desc}</p>
                      </div>
                      <CheckCircle className="w-6 h-6 text-green-500" />
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="relative" data-reveal style={withRevealDelay("80ms")}>
              <div className="aspect-square rounded-3xl overflow-hidden shadow-2xl">
                <div className="w-full h-full bg-cover bg-center transform hover:scale-105 transition-transform duration-700" style={{ backgroundImage: 'url(/factory3.jpg)' }}></div>
              </div>
              <div className="absolute -bottom-6 -right-6 w-72 h-72 bg-linear-to-br from-green-400 to-emerald-400 rounded-3xl opacity-20 blur-3xl -z-10"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Chất lượng chính hãng */}
      <section ref={addToRefs} className="py-24 bg-linear-to-br from-orange-50 to-red-50 reveal">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="relative order-2 md:order-1" data-reveal>
              <div className="aspect-square rounded-3xl overflow-hidden shadow-2xl">
                <div className="w-full h-full bg-cover bg-right transform hover:scale-105 transition-transform duration-700" style={{ backgroundImage: 'url(/quality1.png)' }}></div>
              </div>
              <div className="absolute -top-6 -left-6 w-72 h-72 bg-linear-to-br from-orange-400 to-red-400 rounded-3xl opacity-20 blur-3xl -z-10"></div>
            </div>
            <div className="space-y-6 order-1 md:order-2">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-100 rounded-full" data-reveal>
                <BadgeCheck className="w-5 h-5 text-orange-600" />
                <span className="text-sm font-semibold text-orange-600">Chất lượng đảm bảo</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900" data-reveal style={withRevealDelay("60ms")}>
                100% chính hãng, <span className="text-transparent bg-clip-text bg-linear-to-r from-orange-600 to-red-600">chất lượng vượt trội</span>
              </h2>
              <p className="text-lg text-gray-600 leading-relaxed" data-reveal style={withRevealDelay("120ms")}>
                Mọi sản phẩm đều được nhập khẩu chính hãng từ các nhà sản xuất uy tín. Chúng tôi cam kết 100% về nguồn gốc và chất lượng.
              </p>
              <div className="grid gap-4">
                {[
                  { icon: BadgeCheck, title: "Chứng nhận chính hãng", desc: "CO, CQ đầy đủ từ nhà sản xuất", color: "from-orange-500 to-red-500" },
                  { icon: Shield, title: "Kiểm định chất lượng", desc: "Quy trình kiểm tra nghiêm ngặt", color: "from-red-500 to-pink-500" },
                  { icon: Award, title: "Bảo hành toàn diện", desc: "Từ 12-36 tháng tùy sản phẩm", color: "from-pink-500 to-purple-500" },
                ].map((item, idx) => {
                  const Icon = item.icon;
                  return (
                    <div key={idx} className="group flex items-start gap-4 p-5 bg-white rounded-xl shadow-md hover:shadow-2xl hover:-translate-y-1 transition-all duration-300" data-reveal style={withRevealDelay(`${idx * 90}ms`)}>
                      <div className={`w-14 h-14 bg-linear-to-br ${item.color} rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300`}>
                        <Icon className="w-7 h-7 text-white" />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg text-gray-900 mb-1">{item.title}</h3>
                        <p className="text-gray-600">{item.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center gap-3 p-5 bg-linear-to-r from-orange-500 to-red-500 rounded-xl text-white" data-reveal style={withRevealDelay("60ms")}>
                <Shield className="w-8 h-8 shrink-0" />
                <div>
                  <div className="font-bold text-lg">Cam kết hoàn tiền 100%</div>
                  <div className="text-sm text-orange-100">Nếu phát hiện hàng giả, hàng nhái</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Giao hàng nhanh */}
      <section ref={addToRefs} className="py-24 reveal">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 rounded-full" data-reveal>
                <Truck className="w-5 h-5 text-blue-600" />
                <span className="text-sm font-semibold text-blue-600">Vận chuyển toàn quốc</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900" data-reveal style={withRevealDelay("60ms")}>
                Giao hàng nhanh, <span className="text-transparent bg-clip-text bg-linear-to-r from-blue-600 to-cyan-600">an toàn tuyệt đối</span>
              </h2>
              <p className="text-lg text-gray-600 leading-relaxed" data-reveal style={withRevealDelay("120ms")}>
                Hệ thống kho bãi và vận chuyển hiện đại đảm bảo giao hàng nhanh chóng đến mọi miền đất nước.
              </p>
              <div className="space-y-4">
                <div className="flex items-start gap-4 p-5 bg-linear-to-r from-blue-500 to-cyan-500 text-white rounded-xl shadow-lg" data-reveal>
                  <Clock className="w-8 h-8 shrink-0 mt-1" />
                  <div>
                    <div className="font-bold text-xl mb-1">Giao hàng trong 24-48h</div>
                    <div className="text-blue-100">Đối với khu vực nội thành và các tỉnh lân cận</div>
                  </div>
                </div>
                {[
                  { icon: Truck, title: "Vận chuyển chuyên nghiệp", desc: "Đội xe chuyên dụng, tài xế dày dặn kinh nghiệm" },
                  { icon: Shield, title: "Bảo hiểm 100%", desc: "Đảm bảo bồi thường nếu hư hỏng trong vận chuyển" },
                  { icon: CheckCircle, title: "Theo dõi đơn hàng", desc: "Cập nhật real-time trạng thái giao hàng" },
                ].map((item, idx) => {
                  const Icon = item.icon;
                  return (
                    <div key={idx} className="flex items-start gap-4 p-5 bg-white rounded-xl shadow-md hover:shadow-xl transition-shadow duration-300" data-reveal style={withRevealDelay(`${idx * 90}ms`)}>
                      <div className="w-12 h-12 bg-linear-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center shrink-0">
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900 mb-1">{item.title}</h4>
                        <p className="text-sm text-gray-600">{item.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="relative" data-reveal style={withRevealDelay("80ms")}>
              <div className="aspect-square rounded-3xl overflow-hidden shadow-2xl">
                <div className="w-full h-full bg-cover bg-center transform hover:scale-105 transition-transform duration-700" style={{ backgroundImage: 'url(/time1.webp)' }}></div>
              </div>
              <div className="absolute -bottom-6 -right-6 w-72 h-72 bg-linear-to-br from-blue-400 to-cyan-400 rounded-3xl opacity-20 blur-3xl -z-10"></div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative py-24 bg-linear-to-br from-gray-900 via-blue-900 to-purple-900 text-white overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\"60\" height=\"60\" viewBox=\"0 0 60 60\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cg fill=\"none\" fill-rule=\"evenodd\"%3E%3Cg fill=\"%23ffffff\" fill-opacity=\"1\"%3E%3Cpath d=\"M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }}></div>

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 backdrop-blur-sm rounded-full border border-white/20 mb-6" data-reveal>
            <Sparkles className="w-5 h-5 text-yellow-300" />
            <span className="text-sm font-semibold">Bắt đầu hợp tác ngay hôm nay</span>
          </div>
          <h2 className="text-4xl md:text-4xl font-bold mb-6" data-reveal style={withRevealDelay("60ms")}>
            Sẵn sàng nâng tầm sản xuất của bạn?
          </h2>
          <p className="text-xl text-blue-200 mb-10 max-w-2xl mx-auto" data-reveal style={withRevealDelay("120ms")}>
            Liên hệ ngay để được tư vấn miễn phí và nhận báo giá tốt nhất
          </p>
          <div className="flex flex-wrap gap-4 justify-center" data-reveal style={withRevealDelay("180ms")}>
            <Link href="/contact" className="group px-8 py-4 bg-white text-blue-600 rounded-xl font-bold shadow-2xl hover:shadow-3xl hover:scale-105 transition-all duration-300 flex items-center gap-2">
              Liên hệ ngay
              <Truck className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
            <div className="flex items-center justify-center gap-2" data-reveal>
              <Mail className="w-5 h-5" />
              <span>sales@ahso.vn</span>
            </div>
            <div className="flex items-center justify-center gap-2" data-reveal style={withRevealDelay("60ms")}>
              <LinkIcon className="w-5 h-5" />
              <span>www.ahso.vn</span>
            </div>
            <div className="flex items-center justify-center gap-2" data-reveal style={withRevealDelay("120ms")}>
              <MapPin className="w-5 h-5" />
              <span>39/15 Đ. Cao Bá Quát, Dĩ An, TP.HCM</span>
            </div>
          </div>
        </div>

        <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl"></div>
      </section>

      {/* === Styles: giữ .reveal cũ + thêm [data-reveal] === */}
      <style jsx>{`
        .reveal {
          opacity: 0;
          transform: translateY(50px);
          transition: all 1s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .reveal.animate-in {
          opacity: 1;
          transform: translateY(0);
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.6; }
        }
        .animate-pulse { animation: pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
      `}</style>

      <style jsx global>{`
        @keyframes reveal-fade-up {
          from { opacity: 0; transform: translateY(18px); }
          to { opacity: 1; transform: translateY(0); }
        }
        [data-reveal] {
          opacity: 0;
          transform: translateY(18px);
          will-change: opacity, transform;
        }
        [data-reveal].is-visible {
          animation: reveal-fade-up 0.7s ease-out both;
          animation-delay: var(--d, 0ms);
        }
      `}</style>
    </div>
  );
}
