"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { withRevealDelay } from "@/lib/reveal";
import Link from "next/link";
import {
  Shield,
  RotateCcw,
  Truck,
  FileText,
  Headphones,
  BadgeCheck,
  AlertCircle,
  Lock,
  Globe,
  CheckCircle,
} from "lucide-react";

type PolicySectionDTO = {
  slug: string;
  title: string;
  description?: string | null;
  allowedText?: string | null;
  deniedText?: string | null;
  content?: string | null;
};

const DEFAULT_RETURN_ALLOWED = [
  "Sản phẩm lỗi kỹ thuật do nhà sản xuất.",
  "Sai sản phẩm, thiếu phụ kiện, không đúng mô tả.",
  "Còn nguyên tem, nhãn, hóa đơn, chưa sử dụng.",
];
const DEFAULT_RETURN_DENIED = [
  "Hàng đặt riêng, đã qua sử dụng, tự ý sửa chữa.",
  "Hư hỏng do vận hành sai, thiên tai, tác động ngoại lực.",
];
const DEFAULT_WARRANTY_ALLOWED = [
  "Sản phẩm còn hạn bảo hành, còn tem niêm phong, chưa tự sửa chữa.",
  "Có hoá đơn mua hàng tại AHSO hoặc chứng từ xác nhận.",
];
const DEFAULT_WARRANTY_DENIED = [
  "Hỏng hóc do người dùng tác động, cháy nổ, thiên tai.",
  "Thiếu phụ kiện, tem bảo hành rách, tẩy xoá.",
];
const DEFAULT_PAYMENT_CONTENT = [
  "Cam kết bảo mật tuyệt đối mọi thông tin thanh toán của khách hàng.",
  "Mọi giao dịch đều được mã hoá SSL và xác thực nhiều lớp.",
];
const DEFAULT_SHIPPING_ALLOWED = [
  "Giao hàng toàn quốc, hỗ trợ kiểm tra trước khi nhận.",
  "Thời gian giao từ 1-5 ngày tùy khu vực và phương thức vận chuyển.",
];
const DEFAULT_SHIPPING_DENIED = [
  "Không giao hàng cho các mặt hàng bị cấm vận chuyển theo quy định pháp luật.",
];
const DEFAULT_CANCEL_CONTENT = [
  "Khách hàng có thể hủy đơn trong vòng 24h kể từ khi đặt hàng nếu đơn chưa đóng gói.",
  "Liên hệ hotline/ email để được hỗ trợ thay đổi thông tin đơn hàng.",
];

export default function PolicyPage() {
  const sectionsRef = useRef<HTMLElement[]>([]);
  const [policies, setPolicies] = useState<PolicySectionDTO[]>([]);

  useEffect(() => {
    fetch("/api/policies")
      .then((res) => res.json())
      .then((json) => {
        if (Array.isArray(json?.data)) setPolicies(json.data);
      })
      .catch(() => {
        /* ignore */
      });
  }, []);

  const policyMap = useMemo(() => {
    return policies.reduce<Record<string, PolicySectionDTO>>((acc, section) => {
      acc[section.slug] = section;
      return acc;
    }, {});
  }, [policies]);

  const parseLines = (text?: string | null, fallback: string[] = []) => {
    if (!text) return fallback;
    const parts = text
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    return parts.length > 0 ? parts : fallback;
  };

  const parseParas = (text?: string | null, fallback: string[] = []) => {
    const lines = parseLines(text, fallback);
    return lines.length > 0 ? lines : fallback;
  };

  useEffect(() => {
    // ---- Observer cho .reveal (section lớn) ----
    const sectionObserver = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("animate-in");
            // chỉ chạy 1 lần; muốn lặp lại thì bỏ comment 2 dòng dưới
            // sectionObserver.unobserve(e.target);
            // e.target.classList.remove("animate-in");
          }
        }),
      { threshold: 0.2, rootMargin: "0px 0px -80px 0px" }
    );
    sectionsRef.current.forEach((el) => el && sectionObserver.observe(el));

    // ---- Observer cho [data-reveal] (item nhỏ – fade-up + stagger) ----
    const itemObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((ent) => {
          const el = ent.target as HTMLElement;
          if (ent.isIntersecting) {
            el.classList.add("is-visible");
            itemObserver.unobserve(el); // chạy 1 lần; muốn lặp lại thì comment dòng này và dùng else remove
          }
          // Repeat-mode (tuỳ chọn):
          // else { el.classList.remove("is-visible"); }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -10% 0px" }
    );
    const items = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
    items.forEach((el) => itemObserver.observe(el));

    return () => {
      sectionObserver.disconnect();
      itemObserver.disconnect();
    };
  }, []);

  const addToRefs = (el: HTMLElement | null) => {
    if (el && !sectionsRef.current.includes(el)) sectionsRef.current.push(el);
  };

  const returnPolicy = policyMap["return"];
  const returnAllowed = parseLines(returnPolicy?.allowedText, DEFAULT_RETURN_ALLOWED);
  const returnDenied = parseLines(returnPolicy?.deniedText, DEFAULT_RETURN_DENIED);
  const returnNotes = parseParas(returnPolicy?.content, [
    "Địa chỉ đổi trả: 39/15 Đ. Cao Bá Quát, Khu Phố Đông Tân, Dĩ An, Bình Dương",
  ]);

  const warrantyPolicy = policyMap["warranty"];
  const warrantyAllowed = parseLines(warrantyPolicy?.allowedText, DEFAULT_WARRANTY_ALLOWED);
  const warrantyDenied = parseLines(warrantyPolicy?.deniedText, DEFAULT_WARRANTY_DENIED);

  const paymentPolicy = policyMap["payment-security"];
  const paymentContent = parseParas(paymentPolicy?.content, DEFAULT_PAYMENT_CONTENT);

  const shippingPolicy = policyMap["shipping"];
  const shippingAllowed = parseLines(shippingPolicy?.allowedText, DEFAULT_SHIPPING_ALLOWED);
  const shippingDenied = parseLines(shippingPolicy?.deniedText, DEFAULT_SHIPPING_DENIED);

  const cancellationPolicy = policyMap["cancellation"];
  const cancelContent = parseParas(cancellationPolicy?.content, DEFAULT_CANCEL_CONTENT);

  return (
    <div className="min-h-screen bg-linear-to-b from-gray-50 to-white">
      {/* Hero */}
      <section className="relative bg-linear-to-br from-blue-700 via-blue-800 to-purple-800 text-white py-20 overflow-hidden">
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              'url("data:image/svg+xml,%3Csvg width=\\"60\\" height=\\"60\\" viewBox=\\"0 0 60 60\\" xmlns=\\"http://www.w3.org/2000/svg\\"%3E%3Cg fill=\\"none\\" fill-rule=\\"evenodd\\"%3E%3Cg fill=\\"%23ffffff\\" fill-opacity=\\"1\\"%3E%3Cpath d=\\"M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\\"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
          }}
        />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 backdrop-blur-sm rounded-full border border-white/20 mb-6" data-reveal>
            <FileText className="w-5 h-5" />
            <span className="text-sm font-semibold">Chính sách & Điều khoản</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold mb-4" data-reveal style={withRevealDelay("80ms")}>
            Chính sách của AHSO
          </h1>
          <p className="text-blue-100 max-w-3xl mx-auto text-lg" data-reveal style={withRevealDelay("160ms")}>
            Minh bạch, rõ ràng và đặt trải nghiệm khách hàng làm trung tâm
          </p>
        </div>
        <div className="absolute top-10 right-10 w-72 h-72 bg-blue-400/30 rounded-full blur-3xl"></div>
        <div className="absolute bottom-10 left-10 w-96 h-96 bg-purple-400/30 rounded-full blur-3xl"></div>
      </section>

      {/* Intro */}
      <section ref={addToRefs} className="reveal -mt-16 relative z-10 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: <Shield className="w-6 h-6" />,
                title: "Bảo vệ quyền lợi",
                desc: "Sản phẩm chính hãng, đầy đủ chứng từ.",
                box: "text-blue-700 bg-blue-600/10",
              },
              {
                icon: <RotateCcw className="w-6 h-6" />,
                title: "Đổi trả linh hoạt",
                desc: "Hỗ trợ đổi trả theo điều kiện rõ ràng.",
                box: "text-emerald-700 bg-emerald-600/10",
              },
              {
                icon: <Lock className="w-6 h-6" />,
                title: "Thanh toán an toàn",
                desc: "Mã hóa SSL, PCI DSS, OTP xác thực.",
                box: "text-purple-700 bg-purple-600/10",
              },
            ].map((c, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 shadow-xl" data-reveal style={withRevealDelay(`${i * 100}ms`)}>
                <div className={`w-12 h-12 rounded-xl ${c.box} flex items-center justify-center mb-3`}>{c.icon}</div>
                <div className="font-semibold text-gray-900">{c.title}</div>
                <p className="text-sm text-gray-600 mt-1">{c.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Chính sách đổi trả */}
      <section ref={addToRefs} className="reveal py-14">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-6 flex items-center gap-3" data-reveal>
            <div className="w-12 h-12 bg-linear-to-br from-blue-600 to-cyan-600 rounded-xl flex items-center justify-center">
              <RotateCcw className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900">Chính sách đổi trả</h2>
          </div>

          <div className="bg-white rounded-2xl shadow-md p-6 space-y-5">
            <div data-reveal>
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
                Các trường hợp được đổi trả
              </h3>
              <ul className="space-y-2 text-gray-700 ml-7">
                {returnAllowed.map((t, i) => (
                  <li key={`${t}-${i}`} className="flex gap-2" data-reveal style={withRevealDelay(`${i * 80}ms`)}>
                    <BadgeCheck className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" /> {t}
                  </li>
                ))}
              </ul>
            </div>

            <div data-reveal>
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-600" />
                Không áp dụng đổi trả
              </h3>
              <ul className="space-y-2 text-gray-700 ml-7">
                {returnDenied.map((t, i) => (
                  <li key={`${t}-${i}`} className="flex gap-2" data-reveal style={withRevealDelay(`${i * 80}ms`)}>
                    <span className="w-4 h-4 rounded-full bg-amber-600/20 shrink-0 mt-0.5"></span> {t}
                  </li>
                ))}
              </ul>
            </div>

            <div className="pt-3 border-t" data-reveal>
              {returnNotes.map((note, idx) => (
                <p key={idx} className="text-sm text-gray-600">
                  {note}
                </p>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Chính sách bảo hành */}
      <section ref={addToRefs} className="reveal py-14 bg-linear-to-br from-gray-50 to-blue-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-6 flex items-center gap-3" data-reveal>
            <div className="w-12 h-12 bg-linear-to-br from-emerald-600 to-green-600 rounded-xl flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900">Chính sách bảo hành</h2>
          </div>

          <div className="bg-white rounded-2xl shadow-md p-6 space-y-5">
            <div data-reveal>
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
                Điều kiện bảo hành
              </h3>
              <ul className="space-y-2 text-gray-700 ml-7">
                {warrantyAllowed.map((t, i) => (
                  <li key={`${t}-${i}`} className="flex gap-2" data-reveal style={withRevealDelay(`${i * 80}ms`)}>
                    <BadgeCheck className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" /> {t}
                  </li>
                ))}
              </ul>
            </div>

            <div data-reveal>
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-600" />
                Không bảo hành
              </h3>
              <ul className="space-y-2 text-gray-700 ml-7">
                {warrantyDenied.map((t, i) => (
                  <li key={`${t}-${i}`} className="flex gap-2" data-reveal style={withRevealDelay(`${i * 80}ms`)}>
                    <span className="w-4 h-4 rounded-full bg-amber-600/20 shrink-0 mt-0.5"></span> {t}
                  </li>
                ))}
              </ul>
            </div>

            <div className="pt-3 border-t text-sm text-gray-600" data-reveal>
              <p>Khách hàng chịu phí vận chuyển đến và từ trung tâm bảo hành.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Chính sách bảo mật thanh toán */}
      <section ref={addToRefs} className="reveal py-14">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-6 flex items-center gap-3" data-reveal>
            <div className="w-12 h-12 bg-linear-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center">
              <Lock className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900">Chính sách bảo mật thanh toán</h2>
          </div>

          <div className="bg-white rounded-2xl shadow-md p-6 space-y-5">
            <div className="space-y-3">
              {paymentContent.map((paragraph, idx) => (
                <div key={idx} className="flex items-start gap-3" data-reveal>
                  <Globe className="w-5 h-5 text-purple-600 mt-0.5" />
                  <p className="text-gray-700">{paragraph}</p>
                </div>
              ))}
            </div>

            <div data-reveal>
              <h4 className="font-semibold text-gray-900 mb-2">Tiêu chuẩn bảo mật áp dụng:</h4>
              <ul className="space-y-1 text-gray-700 ml-7">
                {["Giao thức mã hóa SSL", "Chứng nhận PCI DSS", "Xác thực OTP qua SMS", "Mã hóa MD5 128-bit"].map((t, i) => (
                  <li key={i} className="flex gap-2" data-reveal style={withRevealDelay(`${i * 70}ms`)}>
                    <CheckCircle className="w-4 h-4 text-purple-600 mt-0.5 shrink-0" /> <strong>{t}</strong>
                  </li>
                ))}
              </ul>
            </div>

            {paymentPolicy?.description && (
              <div className="bg-purple-50 rounded-xl p-4 border border-purple-200" data-reveal>
                <p className="text-sm text-purple-800 font-medium">{paymentPolicy.description}</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Vận chuyển & nhận hàng */}
      <section ref={addToRefs} className="reveal py-14 bg-linear-to-br from-gray-50 to-purple-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-6 flex items-center gap-3" data-reveal>
            <div className="w-12 h-12 bg-linear-to-br from-blue-600 to-cyan-600 rounded-xl flex items-center justify-center">
              <Truck className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900">Vận chuyển & nhận hàng</h2>
          </div>

          <div className="bg-white rounded-2xl shadow-md p-6 space-y-5">
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">Vận chuyển</h4>
              <ul className="space-y-2 text-gray-700">
                {shippingAllowed.map((text, i) => (
                  <li key={`${text}-${i}`} className="flex gap-2" data-reveal style={withRevealDelay(`${i * 80}ms`)}>
                    <BadgeCheck className="w-5 h-5 text-blue-600 mt-0.5" /> {text}
                  </li>
                ))}
              </ul>
            </div>
            {shippingDenied.length > 0 && (
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Không áp dụng</h4>
                <ul className="space-y-2 text-gray-700">
                  {shippingDenied.map((text, i) => (
                    <li key={`${text}-${i}`} className="flex gap-2" data-reveal style={withRevealDelay(`${i * 80}ms`)}>
                      <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" /> {text}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Hủy đơn & thay đổi */}
      <section ref={addToRefs} className="reveal py-14">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-6 flex items-center gap-3" data-reveal>
            <div className="w-12 h-12 bg-linear-to-br from-fuchsia-600 to-purple-600 rounded-xl flex items-center justify-center">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900">Hủy đơn & thay đổi thông tin</h2>
          </div>

          <div className="bg-white rounded-2xl shadow-md p-6 text-gray-700 space-y-3" data-reveal>
            {cancelContent.map((content, idx) => (
              <p key={idx}>{content}</p>
            ))}
          </div>
        </div>
      </section>

      {/* Liên hệ hỗ trợ */}
      <section ref={addToRefs} className="reveal py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600/10 text-blue-700 rounded-full mb-4" data-reveal>
            <Headphones className="w-5 h-5" />
            <span className="text-sm font-semibold">Hỗ trợ khách hàng</span>
          </div>

          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4" data-reveal style={withRevealDelay("60ms")}>
            Cần trợ giúp ngay?
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto" data-reveal style={withRevealDelay("120ms")}>
            Đội ngũ AHSO sẵn sàng hỗ trợ 24/7 qua hotline, email hoặc biểu mẫu liên hệ.
          </p>

          <div className="mt-8 flex flex-wrap gap-4 justify-center" data-reveal style={withRevealDelay("180ms")}>
            <Link
              href="/contact"
              className="group px-8 py-4 bg-white text-blue-600 rounded-xl font-bold shadow-2xl hover:shadow-3xl hover:scale-105 transition-all duration-300 flex items-center gap-2"
            >
              Liên hệ ngay
              <Headphones className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="/profile/orders"
              className="px-8 py-4 bg-blue-600 text-white rounded-xl font-bold border-2 border-blue-600 hover:bg-blue-700 hover:scale-105 transition-all duration-300"
            >
              Theo dõi đơn hàng
            </Link>
          </div>
        </div>
      </section>

      {/* Ghi chú pháp lý */}
      <section ref={addToRefs} className="reveal py-10 bg-linear-to-br from-gray-100 to-gray-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-sm text-gray-600">
          <p className="mb-2" data-reveal>
            <span className="font-semibold">Lưu ý:</span> Chính sách có thể được cập nhật theo quy định pháp luật và chính sách nhà sản xuất.
          </p>
          <p data-reveal style={withRevealDelay("80ms")}>
            Ngày hiệu lực hiện tại: <span className="font-medium">03/05/2022</span> (Cập nhật lần cuối).
          </p>
        </div>
      </section>

      {/* Local styles */}
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
