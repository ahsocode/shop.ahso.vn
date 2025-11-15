"use client";

import { useState, useEffect, type ChangeEvent, type FormEvent } from "react";
import { withRevealDelay } from "@/lib/reveal";
import {
  Mail,
  Phone,
  MapPin,
  Clock,
  Send,
  User,
  Building2,
  MessageSquare,
  CheckCircle,
  Sparkles,
  Facebook,
  Linkedin,
  Youtube,
  Globe,
  Headphones,
} from "lucide-react";

type FormData = {
  name: string;
  email: string;
  phone: string;
  company: string;
  subject: string;
  message: string;
};

export default function ContactPage() {
  const [formData, setFormData] = useState<FormData>({
    name: "",
    email: "",
    phone: "",
    company: "",
    subject: "",
    message: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    // ---- Observer cho section lớn (.reveal) ----
    const sectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("animate-in");
            // Lặp lại khi ra/vào viewport? -> comment dòng dưới và dùng else để remove
            // sectionObserver.unobserve(entry.target);
          } else {
            // Bật repeat-mode: bỏ comment nếu muốn lặp lại
            // entry.target.classList.remove("animate-in");
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -10% 0px" }
    );

    document.querySelectorAll<HTMLElement>(".reveal").forEach((el) => sectionObserver.observe(el));

    // ---- Observer cho item nhỏ ([data-reveal]) ----
    const itemObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((ent) => {
          const el = ent.target as HTMLElement;
          if (ent.isIntersecting) {
            el.classList.add("is-visible");
            itemObserver.unobserve(el); // chạy 1 lần; muốn lặp lại thì comment dòng này và bật else để remove
          } else {
            // Repeat-mode (tuỳ chọn)
            // el.classList.remove("is-visible");
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px" }
    );

    document.querySelectorAll<HTMLElement>("[data-reveal]").forEach((el) => itemObserver.observe(el));

    return () => {
      sectionObserver.disconnect();
      itemObserver.disconnect();
    };
  }, []);

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    setTimeout(() => {
      setIsSubmitting(false);
      setIsSuccess(true);
      console.log("Form submitted:", formData);

      setTimeout(() => {
        setIsSuccess(false);
        setFormData({
          name: "",
          email: "",
          phone: "",
          company: "",
          subject: "",
          message: "",
        });
      }, 3000);
    }, 1500);
  };

  const contactInfo = [
    {
      icon: Phone,
      title: "Điện thoại",
      content: "0901 951 351",
      subContent: "Thứ 2 - Thứ 7: 8:00 - 18:00",
      color: "from-blue-500 to-cyan-500",
      link: "tel:+84901951351",
    },
    {
      icon: Mail,
      title: "Email",
      content: "sales@ahso.vn",
      subContent: "Phản hồi trong 24h",
      color: "from-purple-500 to-pink-500",
      link: "mailto:sales@ahso.vn",
    },
    {
      icon: MapPin,
      title: "Địa chỉ",
      content: "39/15 Cao Bá Quát, Khu Phố Đông Tân, Dĩ An, TP.HCM",
      subContent: "TP. Hồ Chí Minh, Việt Nam",
      color: "from-orange-500 to-red-500",
      link: "#",
    },
    {
      icon: Clock,
      title: "Giờ làm việc",
      content: "Thứ 2 - Thứ 6: 8:00 - 17:30",
      subContent: "Thứ 7: 8:00 - 12:00",
      color: "from-green-500 to-emerald-500",
      link: "#",
    },
  ] as const;

  const socialLinks = [
    { icon: Facebook, name: "Facebook", link: "https://www.facebook.com/profile.php?id=61576136387582", color: "hover:bg-blue-600" },
    { icon: Linkedin, name: "LinkedIn", link: "#", color: "hover:bg-blue-700" },
    { icon: Youtube, name: "YouTube", link: "#", color: "hover:bg-red-600" },
    { icon: Globe, name: "Website", link: "#", color: "hover:bg-purple-600" },
  ] as const;

  // ==== Google Maps config ====
  const mapsAddress = "Công ty TNHH AHSO 39/15 Cao Bá Quát, Khu Phố Đông Tân, Dĩ An, TP.HCM";
  const mapsQuery = encodeURIComponent(mapsAddress);
  const mapsUrl = `https://maps.app.goo.gl/VteyBSCYdoptCoVk6`;
  const mapsEmbedUrl = `https://www.google.com/maps?q=${mapsQuery}&output=embed`;

  return (
    <div className="min-h-screen bg-linear-to-b from-gray-50 to-white">
      {/* Hero */}
      <section className="relative bg-linear-to-br from-blue-600 via-blue-700 to-purple-700 text-white py-20 overflow-hidden">
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              'url("data:image/svg+xml,%3Csvg width=\\"60\\" height=\\"60\\" viewBox=\\"0 0 60 60\\" xmlns=\\"http://www.w3.org/2000/svg\\"%3E%3Cg fill=\\"none\\" fill-rule=\\"evenodd\\"%3E%3Cg fill=\\"%23ffffff\\" fill-opacity=\\"1\\"%3E%3Cpath d=\\"M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\\"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
          }}
        />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 backdrop-blur-sm rounded-full border border-white/20 mb-6" data-reveal>
            <Headphones className="w-5 h-5" />
            <span className="text-sm font-semibold">Hỗ trợ 24/7</span>
          </div>

          <h1 className="text-5xl md:text-6xl font-bold mb-6" data-reveal style={withRevealDelay("80ms")}>
            Liên hệ với chúng tôi
          </h1>

          <p className="text-xl text-blue-100 max-w-2xl mx-auto" data-reveal style={withRevealDelay("160ms")}>
            Đội ngũ chuyên gia của AHSO sẵn sàng tư vấn và hỗ trợ bạn tìm ra giải pháp tốt nhất
          </p>
        </div>

        <div className="absolute top-10 right-10 w-72 h-72 bg-blue-400/30 rounded-full blur-3xl"></div>
        <div className="absolute bottom-10 left-10 w-96 h-96 bg-purple-400/30 rounded-full blur-3xl"></div>
      </section>

      {/* Contact Info Cards */}
      <section className="py-16 -mt-16 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
            {contactInfo.map((info, idx) => {
              const Icon = info.icon;
              return (
                <div key={idx} className="pt-2">
                  <a
                    href={info.link}
                    className="reveal group block bg-white rounded-2xl p-6 shadow-xl transition-all duration-300 will-change-transform translate-y-0 hover:-translate-y-2 hover:shadow-2xl h-full"
                    data-reveal
                    style={withRevealDelay(`${idx * 100}ms`)}
                    aria-label={info.title}
                  >
                    <div
                      className={`w-14 h-14 bg-linear-to-br ${info.color} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300`}
                    >
                      <Icon className="w-7 h-7 text-white" />
                    </div>
                    <h3 className="font-bold text-lg text-gray-900 mb-2">{info.title}</h3>
                    <p className="text-gray-700 font-semibold mb-1">{info.content}</p>
                    <p className="text-sm text-gray-500">{info.subContent}</p>
                  </a>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Main Contact Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            {/* Left - Form */}
            <div className="reveal">
              <div className="mb-8">
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4" data-reveal>Gửi thông tin liên hệ</h2>
                <p className="text-lg text-gray-600" data-reveal style={withRevealDelay("80ms")}>
                  Điền thông tin bên dưới và chúng tôi sẽ liên hệ lại với bạn trong thời gian sớm nhất
                </p>
              </div>

              <form className="space-y-6" onSubmit={handleSubmit}>
                {/* Name */}
                <div className="group" data-reveal>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Họ và tên <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2">
                      <User className="w-5 h-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                    </div>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all duration-300 outline-none"
                      placeholder="Nguyễn Văn A"
                      autoComplete="name"
                    />
                  </div>
                </div>

                {/* Email */}
                <div className="group" data-reveal style={withRevealDelay("60ms")}>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2">
                      <Mail className="w-5 h-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                    </div>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all duration-300 outline-none"
                      placeholder="email@example.com"
                      autoComplete="email"
                    />
                  </div>
                </div>

                {/* Phone */}
                <div className="group" data-reveal style={withRevealDelay("120ms")}>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Số điện thoại <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2">
                      <Phone className="w-5 h-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                    </div>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      required
                      className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all duration-300 outline-none"
                      placeholder="0123 456 789"
                      autoComplete="tel"
                      inputMode="tel"
                    />
                  </div>
                </div>

                {/* Company */}
                <div className="group" data-reveal style={withRevealDelay("180ms")}>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Tên công ty</label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2">
                      <Building2 className="w-5 h-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                    </div>
                    <input
                      type="text"
                      name="company"
                      value={formData.company}
                      onChange={handleChange}
                      className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all duration-300 outline-none"
                      placeholder="Công ty TNHH..."
                      autoComplete="organization"
                    />
                  </div>
                </div>

                {/* Subject */}
                <div className="group" data-reveal style={withRevealDelay("240ms")}>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Chủ đề</label>
                  <select
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all duration-300 outline-none bg-white"
                  >
                    <option value="">Chọn chủ đề</option>
                    <option value="product">Tư vấn sản phẩm</option>
                    <option value="quote">Yêu cầu báo giá</option>
                    <option value="support">Hỗ trợ kỹ thuật</option>
                    <option value="partnership">Hợp tác kinh doanh</option>
                    <option value="other">Khác</option>
                  </select>
                </div>

                {/* Message */}
                <div className="group" data-reveal style={withRevealDelay("300ms")}>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Nội dung <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute left-4 top-4">
                      <MessageSquare className="w-5 h-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                    </div>
                    <textarea
                      name="message"
                      value={formData.message}
                      onChange={handleChange}
                      required
                      rows={5}
                      className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all duration-300 outline-none resize-none"
                      placeholder="Mô tả chi tiết yêu cầu của bạn..."
                    />
                  </div>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={isSubmitting || isSuccess}
                  className={`group w-full py-4 px-8 rounded-xl font-bold text-white shadow-lg transition-all duration-300 flex items-center justify-center gap-3 ${
                    isSuccess
                      ? "bg-green-500 hover:bg-green-600"
                      : "bg-linear-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 hover:shadow-xl hover:scale-105"
                  } disabled:opacity-70 disabled:cursor-not-allowed`}
                  data-reveal
                  style={withRevealDelay("360ms")}
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Đang gửi...
                    </>
                  ) : isSuccess ? (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      Đã gửi thành công!
                    </>
                  ) : (
                    <>
                      Gửi thông tin
                      <Send className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>

                <p className="text-sm text-gray-500 text-center" data-reveal style={withRevealDelay("420ms")}>
                  Bằng cách gửi thông tin, bạn đồng ý với{" "}
                  <span className="text-blue-600 cursor-pointer hover:underline">chính sách bảo mật</span> của chúng tôi
                </p>
              </form>
            </div>

            {/* Right - Info */}
            <div className="reveal lg:sticky lg:top-24">
              <div className="bg-linear-to-br from-blue-50 to-purple-50 rounded-3xl p-8 mb-8 shadow-lg">
                <div className="flex items-center gap-3 mb-6" data-reveal>
                  <div className="w-12 h-12 bg-linear-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900">Tại sao liên hệ với AHSO?</h3>
                </div>

                <div className="space-y-4">
                  {[
                    { icon: Headphones, text: "Tư vấn miễn phí từ chuyên gia" },
                    { icon: CheckCircle, text: "Báo giá nhanh chóng trong 24h" },
                    { icon: Sparkles, text: "Giải pháp tối ưu cho nhu cầu của bạn" },
                    { icon: Phone, text: "Hỗ trợ kỹ thuật 24/7" },
                  ].map((item, idx) => {
                    const Icon = item.icon;
                    return (
                      <div key={idx} className="flex items-center gap-3 p-4 bg-white rounded-xl" data-reveal style={withRevealDelay(`${idx * 80}ms`)}>
                        <div className="w-10 h-10 bg-linear-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center shrink-0">
                          <Icon className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-gray-700 font-medium">{item.text}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Map (Google Maps embed + click-through) */}
              <div className="bg-white rounded-3xl overflow-hidden shadow-lg" data-reveal>
                <div className="relative aspect-video">
                  <iframe
                    src={mapsEmbedUrl}
                    title="Bản đồ Google Maps - AHSO"
                    className="absolute inset-0 w-full h-full border-0"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    allowFullScreen
                  />
                  {/* Click overlay: open Maps in new tab */}
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Mở vị trí trên Google Maps"
                    className="absolute inset-0"
                  />
                </div>
                <div className="p-4 text-sm text-gray-600 border-t">
                  Nhấn vào bản đồ để mở Google Maps
                </div>
              </div>

              {/* Social */}
              <div className="bg-white rounded-3xl p-6 shadow-lg mt-8" data-reveal>
                <h4 className="font-bold text-lg text-gray-900 mb-4">Kết nối với chúng tôi</h4>
                <div className="flex gap-3">
                  {socialLinks.map((social, idx) => {
                    const Icon = social.icon;
                    return (
                      <button
                        key={idx}
                        onClick={() => window.open(social.link, "_blank")}
                        className={`w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center transition-all duration-300 hover:scale-110 ${social.color} group`}
                        title={social.name}
                        data-reveal
                        style={withRevealDelay(`${idx * 70}ms`)}
                        aria-label={social.name}
                      >
                        <Icon className="w-5 h-5 text-gray-600 group-hover:text-white transition-colors" />
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 bg-linear-to-br from-gray-50 to-blue-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12" data-reveal>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Câu hỏi thường gặp</h2>
            <p className="text-lg text-gray-600">Một số thông tin hữu ích trước khi bạn liên hệ</p>
          </div>

          <div className="space-y-4">
            {[
              {
                q: "Thời gian phản hồi là bao lâu?",
                a: "Chúng tôi cam kết phản hồi trong vòng 24 giờ làm việc. Đối với các yêu cầu khẩn cấp, vui lòng gọi hotline để được hỗ trợ ngay.",
              },
              {
                q: "Tôi có thể yêu cầu báo giá trực tiếp không?",
                a: "Có, bạn có thể chọn 'Yêu cầu báo giá' trong mục chủ đề và mô tả chi tiết sản phẩm cần báo giá. Chúng tôi sẽ gửi báo giá chi tiết trong 24-48h.",
              },
              {
                q: "AHSO có hỗ trợ tư vấn kỹ thuật không?",
                a: "Có, đội ngũ kỹ sư của chúng tôi sẵn sàng tư vấn miễn phí về giải pháp kỹ thuật phù hợp nhất cho doanh nghiệp bạn.",
              },
              {
                q: "Tôi muốn đến trực tiếp văn phòng, có cần hẹn trước không?",
                a: "Để phục vụ tốt nhất, chúng tôi khuyến khích bạn đặt lịch hẹn trước qua hotline hoặc email để được sắp xếp chuyên gia phù hợp.",
              },
            ].map((faq, idx) => (
              <details
                key={idx}
                className="reveal group bg-white rounded-2xl shadow-md hover:shadow-lg transition-all duration-300"
                data-reveal
                style={withRevealDelay(`${idx * 90}ms`)}
              >
                <summary className="flex items-center justify-between p-6 cursor-pointer list-none">
                  <span className="font-semibold text-gray-900 pr-4">{faq.q}</span>
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center shrink-0 group-open:rotate-180 transition-transform duration-300">
                    <svg
                      className="w-5 h-5 text-blue-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </summary>
                <div className="px-6 pb-6 text-gray-600">{faq.a}</div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Styles */}
      <style jsx>{`
        .reveal {
          opacity: 0;
          transform: translateY(30px);
          transition: all 0.8s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .reveal.animate-in {
          opacity: 1;
          transform: translateY(0);
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .animate-spin { animation: spin 1s linear infinite; }
      `}</style>

      {/* Global item reveal */}
      <style jsx global>{`
        @keyframes reveal-fade-up {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
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
