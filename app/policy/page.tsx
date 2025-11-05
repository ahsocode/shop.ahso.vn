"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import {
  Shield,
  RotateCcw,
  CreditCard,
  Truck,
  Clock,
  Info,
  FileText,
  Headphones,
  Receipt,
  PackageCheck,
  BadgeCheck,
  AlertCircle,
  Lock,
  Globe,
  CheckCircle,
} from "lucide-react";

export default function PolicyPage() {
  const sectionsRef = useRef<HTMLElement[]>([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) e.target.classList.add("animate-in");
        }),
      { threshold: 0.2, rootMargin: "0px 0px -80px 0px" }
    );
    sectionsRef.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const addToRefs = (el: HTMLElement | null) => {
    if (el && !sectionsRef.current.includes(el)) sectionsRef.current.push(el);
  };

  return (
    <div className="min-h-screen bg-linear-to-b from-gray-50 to-white">
      {/* Hero */}
      <section className="relative bg-linear-to-br from-blue-700 via-blue-800 to-purple-800 text-white py-20 overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage:
            'url("data:image/svg+xml,%3Csvg width=\\"60\\" height=\\"60\\" viewBox=\\"0 0 60 60\\" xmlns=\\"http://www.w3.org/2000/svg\\"%3E%3Cg fill=\\"none\\" fill-rule=\\"evenodd\\"%3E%3Cg fill=\\"%23ffffff\\" fill-opacity=\\"1\\"%3E%3Cpath d=\\"M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\\"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
        }} />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 backdrop-blur-sm rounded-full border border-white/20 mb-6">
            <FileText className="w-5 h-5" />
            <span className="text-sm font-semibold">Chính sách & Điều khoản</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold mb-4">Chính sách của AHSO</h1>
          <p className="text-blue-100 max-w-3xl mx-auto text-lg">
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
            <div className="bg-white rounded-2xl p-6 shadow-xl">
              <div className="w-12 h-12 rounded-xl bg-blue-600/10 text-blue-700 flex items-center justify-center mb-3">
                <Shield className="w-6 h-6" />
              </div>
              <div className="font-semibold text-gray-900">Bảo vệ quyền lợi</div>
              <p className="text-sm text-gray-600 mt-1">Sản phẩm chính hãng, đầy đủ chứng từ.</p>
            </div>
            <div className="bg-white rounded-2xl p-6 shadow-xl">
              <div className="w-12 h-12 rounded-xl bg-emerald-600/10 text-emerald-700 flex items-center justify-center mb-3">
                <RotateCcw className="w-6 h-6" />
              </div>
              <div className="font-semibold text-gray-900">Đổi trả linh hoạt</div>
              <p className="text-sm text-gray-600 mt-1">Hỗ trợ đổi trả theo điều kiện rõ ràng.</p>
            </div>
            <div className="bg-white rounded-2xl p-6 shadow-xl">
              <div className="w-12 h-12 rounded-xl bg-purple-600/10 text-purple-700 flex items-center justify-center mb-3">
                <Lock className="w-6 h-6" />
              </div>
              <div className="font-semibold text-gray-900">Thanh toán an toàn</div>
              <p className="text-sm text-gray-600 mt-1">Mã hóa SSL, PCI DSS, OTP xác thực.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Chính sách đổi trả */}
      <section ref={addToRefs} className="reveal py-14">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-6 flex items-center gap-3">
            <div className="w-12 h-12 bg-linear-to-br from-blue-600 to-cyan-600 rounded-xl flex items-center justify-center">
              <RotateCcw className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900">Chính sách đổi trả</h2>
          </div>

          <div className="bg-white rounded-2xl shadow-md p-6 space-y-5">
            <div>
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
                Các trường hợp được đổi trả
              </h3>
              <ul className="space-y-2 text-gray-700 ml-7">
                <li className="flex gap-2"><BadgeCheck className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" /> Sản phẩm lỗi kỹ thuật do nhà sản xuất.</li>
                <li className="flex gap-2"><BadgeCheck className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" /> Sai sản phẩm, thiếu phụ kiện, không đúng mô tả.</li>
                <li className="flex gap-2"><BadgeCheck className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" /> Còn nguyên tem, nhãn, hóa đơn, chưa sử dụng.</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-600" />
                Không áp dụng đổi trả
              </h3>
              <ul className="space-y-2 text-gray-700 ml-7">
                <li className="flex gap-2"><span className="w-4 h-4 rounded-full bg-amber-600/20 shrink-0 mt-0.5"></span> Hàng đặt riêng, đã qua sử dụng, tự ý sửa chữa.</li>
                <li className="flex gap-2"><span className="w-4 h-4 rounded-full bg-amber-600/20 shrink-0 mt-0.5"></span> Hư hỏng do vận hành sai, thiên tai, tác động ngoại lực.</li>
              </ul>
            </div>

            <div className="pt-3 border-t">
              <p className="text-sm text-gray-600">
                <strong>Địa chỉ đổi trả:</strong> 39/15 Đ. Cao Bá Quát, Khu Phố Đông Tân, Dĩ An, Bình Dương
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Chính sách bảo hành */}
      <section ref={addToRefs} className="reveal py-14 bg-linear-to-br from-gray-50 to-blue-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-6 flex items-center gap-3">
            <div className="w-12 h-12 bg-linear-to-br from-emerald-600 to-green-600 rounded-xl flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900">Chính sách bảo hành</h2>
          </div>

          <div className="bg-white rounded-2xl shadow-md p-6 space-y-5">
            <div>
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
                Điều kiện bảo hành
              </h3>
              <ul className="space-y-2 text-gray-700 ml-7">
                <li className="flex gap-2"><BadgeCheck className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" /> Còn tem, số seri, trong thời hạn bảo hành (12–36 tháng tùy sản phẩm).</li>
                <li className="flex gap-2"><BadgeCheck className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" /> Lỗi kỹ thuật do nhà sản xuất.</li>
                <li className="flex gap-2"><BadgeCheck className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" /> Chưa tháo mở, tự ý sửa chữa.</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-600" />
                Không bảo hành
              </h3>
              <ul className="space-y-2 text-gray-700 ml-7">
                <li className="flex gap-2"><span className="w-4 h-4 rounded-full bg-amber-600/20 shrink-0 mt-0.5"></span> Sử dụng sai điện áp, quá tải, không bảo dưỡng định kỳ.</li>
                <li className="flex gap-2"><span className="w-4 h-4 rounded-full bg-amber-600/20 shrink-0 mt-0.5"></span> Hư hỏng do người dùng, thiên tai, tai nạn.</li>
                <li className="flex gap-2"><span className="w-4 h-4 rounded-full bg-amber-600/20 shrink-0 mt-0.5"></span> Phiếu bảo hành bị tẩy xóa, sai lệch thông tin.</li>
              </ul>
            </div>

            <div className="pt-3 border-t text-sm text-gray-600">
              <p>Khách hàng chịu phí vận chuyển đến và từ trung tâm bảo hành.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Chính sách bảo mật thanh toán */}
      <section ref={addToRefs} className="reveal py-14">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-6 flex items-center gap-3">
            <div className="w-12 h-12 bg-linear-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center">
              <Lock className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900">Chính sách bảo mật thanh toán</h2>
          </div>

          <div className="bg-white rounded-2xl shadow-md p-6 space-y-5">
            <div className="flex items-start gap-3">
              <Globe className="w-5 h-5 text-purple-600 mt-0.5" />
              <p className="text-gray-700">
                Hệ thống thanh toán được cung cấp bởi <span className="font-semibold">đối tác cổng thanh toán hợp pháp</span> tại Việt Nam, tuân thủ đầy đủ tiêu chuẩn bảo mật ngành.
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Tiêu chuẩn bảo mật áp dụng:</h4>
              <ul className="space-y-1 text-gray-700 ml-7">
                <li className="flex gap-2"><CheckCircle className="w-4 h-4 text-purple-600 mt-0.5 shrink-0" /> Giao thức mã hóa <strong>SSL</strong></li>
                <li className="flex gap-2"><CheckCircle className="w-4 h-4 text-purple-600 mt-0.5 shrink-0" /> Chứng nhận <strong>PCI DSS</strong></li>
                <li className="flex gap-2"><CheckCircle className="w-4 h-4 text-purple-600 mt-0.5 shrink-0" /> Xác thực <strong>OTP qua SMS</strong></li>
                <li className="flex gap-2"><CheckCircle className="w-4 h-4 text-purple-600 mt-0.5 shrink-0" /> Mã hóa <strong>MD5 128-bit</strong></li>
              </ul>
            </div>

            <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
              <p className="text-sm text-purple-800 font-medium">
                AHSO <strong>không lưu trữ thông tin thẻ</strong>. Dữ liệu được mã hóa và bảo mật bởi đối tác thanh toán.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Vận chuyển & nhận hàng */}
      <section ref={addToRefs} className="reveal py-14 bg-linear-to-br from-gray-50 to-purple-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-6 flex items-center gap-3">
            <div className="w-12 h-12 bg-linear-to-br from-blue-600 to-cyan-600 rounded-xl flex items-center justify-center">
              <Truck className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900">Vận chuyển & nhận hàng</h2>
          </div>

          <div className="bg-white rounded-2xl shadow-md p-6">
            <ul className="space-y-3 text-gray-700">
              <li className="flex gap-3"><BadgeCheck className="w-5 h-5 text-blue-600 mt-0.5" /> Kiểm tra thùng hàng nguyên vẹn, không ướt/móp khi nhận.</li>
              <li className="flex gap-3"><BadgeCheck className="w-5 h-5 text-blue-600 mt-0.5" /> Ghi nhận bất thường với shipper và liên hệ AHSO ngay.</li>
              <li className="flex gap-3"><AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" /> Hàng cồng kềnh cần kỹ thuật viên AHSO lắp đặt.</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Hủy đơn & thay đổi */}
      <section ref={addToRefs} className="reveal py-14">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-6 flex items-center gap-3">
            <div className="w-12 h-12 bg-linear-to-br from-fuchsia-600 to-purple-600 rounded-xl flex items-center justify-center">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900">Hủy đơn & thay đổi thông tin</h2>
          </div>

          <div className="bg-white rounded-2xl shadow-md p-6 text-gray-700">
            <p>Yêu cầu <span className="font-semibold">hủy đơn</span> hoặc <span className="font-semibold">sửa địa chỉ/hóa đơn</span> được xử lý <strong>trước khi giao cho vận chuyển</strong>.</p>
            <p className="mt-2">Liên hệ ngay qua hotline hoặc email để được hỗ trợ nhanh nhất.</p>
          </div>
        </div>
      </section>

      {/* Liên hệ hỗ trợ */}
      <section ref={addToRefs} className="reveal py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600/10 text-blue-700 rounded-full mb-4">
            <Headphones className="w-5 h-5" />
            <span className="text-sm font-semibold">Hỗ trợ khách hàng</span>
          </div>

          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Cần trợ giúp ngay?</h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Đội ngũ AHSO sẵn sàng hỗ trợ 24/7 qua hotline, email hoặc biểu mẫu liên hệ.
          </p>

          <div className="mt-8 flex flex-wrap gap-4 justify-center">
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
          <p className="mb-2">
            <span className="font-semibold">Lưu ý:</span> Chính sách có thể được cập nhật theo quy định pháp luật và chính sách nhà sản xuất.
          </p>
          <p>
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
    </div>
  );
}