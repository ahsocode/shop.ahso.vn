"use client";

import { useState, useEffect, type ChangeEvent, type FormEvent } from "react";
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
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add("animate-in");
        });
      },
      { threshold: 0.1 }
    );

    const elements = document.querySelectorAll(".reveal");
    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
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
      content: "+84 123 456 789",
      subContent: "Thứ 2 - Thứ 7: 8:00 - 18:00",
      color: "from-blue-500 to-cyan-500",
      link: "tel:+84123456789",
    },
    {
      icon: Mail,
      title: "Email",
      content: "contact@ahso.com",
      subContent: "Phản hồi trong 24h",
      color: "from-purple-500 to-pink-500",
      link: "mailto:contact@ahso.com",
    },
    {
      icon: MapPin,
      title: "Địa chỉ",
      content: "123 Đường ABC, Quận XYZ",
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
    { icon: Facebook, name: "Facebook", link: "#", color: "hover:bg-blue-600" },
    { icon: Linkedin, name: "LinkedIn", link: "#", color: "hover:bg-blue-700" },
    { icon: Youtube, name: "YouTube", link: "#", color: "hover:bg-red-600" },
    { icon: Globe, name: "Website", link: "#", color: "hover:bg-purple-600" },
  ] as const;

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
        ></div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 backdrop-blur-sm rounded-full border border-white/20 mb-6">
            <Headphones className="w-5 h-5" />
            <span className="text-sm font-semibold">Hỗ trợ 24/7</span>
          </div>

          <h1 className="text-5xl md:text-6xl font-bold mb-6">Liên hệ với chúng tôi</h1>

          <p className="text-xl text-blue-100 max-w-2xl mx-auto">
            Đội ngũ chuyên gia của AHSO sẵn sàng tư vấn và hỗ trợ bạn tìm ra giải pháp tốt nhất
          </p>
        </div>

        <div className="absolute top-10 right-10 w-72 h-72 bg-blue-400/30 rounded-full blur-3xl"></div>
        <div className="absolute bottom-10 left-10 w-96 h-96 bg-purple-400/30 rounded-full blur-3xl"></div>
      </section>

      {/* Contact Info Cards */}
      <section className="py-16 -mt-16 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {contactInfo.map((info, idx) => {
              const Icon = info.icon;
              return (
                // wrapper chừa khoảng trống cho hiệu ứng lift
                <div key={idx} className="pt-2">
                  <a
                    href={info.link}
                    className="reveal group block bg-white rounded-2xl p-6 shadow-xl transition-all duration-300 will-change-transform translate-y-0 hover:-translate-y-2 hover:shadow-2xl"
                    style={{ animationDelay: `${idx * 100}ms` }}
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
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Gửi thông tin liên hệ</h2>
                <p className="text-lg text-gray-600">
                  Điền thông tin bên dưới và chúng tôi sẽ liên hệ lại với bạn trong thời gian sớm nhất
                </p>
              </div>

              <form className="space-y-6" onSubmit={handleSubmit}>
                {/* Name */}
                <div className="group">
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
                    />
                  </div>
                </div>

                {/* Email */}
                <div className="group">
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
                    />
                  </div>
                </div>

                {/* Phone */}
                <div className="group">
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
                    />
                  </div>
                </div>

                {/* Company */}
                <div className="group">
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
                    />
                  </div>
                </div>

                {/* Subject */}
                <div className="group">
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
                <div className="group">
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

                <p className="text-sm text-gray-500 text-center">
                  Bằng cách gửi thông tin, bạn đồng ý với{" "}
                  <span className="text-blue-600 cursor-pointer hover:underline">chính sách bảo mật</span> của chúng tôi
                </p>
              </form>
            </div>

            {/* Right - Info */}
            <div className="reveal lg:sticky lg:top-24">
              <div className="bg-linear-to-br from-blue-50 to-purple-50 rounded-3xl p-8 mb-8 shadow-lg">
                <div className="flex items-center gap-3 mb-6">
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
                      <div key={idx} className="flex items-center gap-3 p-4 bg-white rounded-xl">
                        <div className="w-10 h-10 bg-linear-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center shrink-0">
                          <Icon className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-gray-700 font-medium">{item.text}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Map */}
              <div className="bg-white rounded-3xl overflow-hidden shadow-lg">
                <div className="aspect-video bg-linear-to-br from-blue-100 to-purple-100 relative">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <MapPin className="w-16 h-16 text-blue-600 mx-auto mb-4" />
                      <p className="text-gray-600 font-semibold">Bản đồ văn phòng</p>
                      <p className="text-sm text-gray-500 mt-1">123 Đường ABC, Q.XYZ, TP.HCM</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Social */}
              <div className="bg-white rounded-3xl p-6 shadow-lg mt-8">
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
          <div className="text-center mb-12">
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
          to {
            transform: rotate(360deg);
          }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  );
}
