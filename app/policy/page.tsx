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
                <CreditCard className="w-6 h-6" />
              </div>
              <div className="font-semibold text-gray-900">Hoàn tiền minh bạch</div>
              <p className="text-sm text-gray-600 mt-1">Quy trình nhanh chóng, dễ theo dõi.</p>
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

          <div className="bg-white rounded-2xl shadow-md p-6 space-y-4">
            <div className="flex items-start gap-3">
              <BadgeCheck className="w-5 h-5 text-emerald-600 mt-0.5" />
              <p className="text-gray-700">
                Thời hạn đổi trả: <span className="font-semibold">07 ngày</span> kể từ ngày nhận hàng đối với lỗi do nhà sản xuất; <span className="font-semibold">03 ngày</span> đối với sai sản phẩm/thiếu phụ kiện.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <PackageCheck className="w-5 h-5 text-blue-600 mt-0.5" />
              <p className="text-gray-700">
                Điều kiện: Sản phẩm còn nguyên tem/nhãn, đầy đủ phụ kiện, không trầy xước, móp méo, có hóa đơn/chứng từ kèm theo.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
              <p className="text-gray-700">
                Không áp dụng đổi trả với các sản phẩm làm theo yêu cầu riêng, hàng đã qua sử dụng sai quy cách hoặc hư hỏng do lắp đặt/vận hành không đúng hướng dẫn.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Chính sách hoàn tiền */}
      <section ref={addToRefs} className="reveal py-14 bg-linear-to-br from-gray-50 to-blue-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-6 flex items-center gap-3">
            <div className="w-12 h-12 bg-linear-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center">
              <CreditCard className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900">Chính sách hoàn tiền</h2>
          </div>

          <div className="bg-white rounded-2xl shadow-md p-6 space-y-4">
            <div className="flex items-start gap-3">
              <Receipt className="w-5 h-5 text-purple-600 mt-0.5" />
              <p className="text-gray-700">
                Hình thức hoàn tiền: theo phương thức đã thanh toán (chuyển khoản/tiền mặt), hoặc trừ trực tiếp trên đơn thay thế.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-blue-600 mt-0.5" />
              <p className="text-gray-700">
                Thời gian xử lý: <span className="font-semibold">3–7 ngày làm việc</span> từ khi xác nhận yêu cầu hợp lệ. Một số ngân hàng có thể cộng thêm thời gian hạch toán.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-amber-600 mt-0.5" />
              <p className="text-gray-700">
                Phí phát sinh (nếu có) do bên vận chuyển/ngân hàng sẽ được thông báo minh bạch trước khi tiến hành.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Bảo hành & vận chuyển */}
      <section ref={addToRefs} className="reveal py-14">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 grid md:grid-cols-2 gap-6">
          {/* Bảo hành */}
          <div className="bg-white rounded-2xl shadow-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-linear-to-br from-emerald-600 to-green-600 rounded-xl flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900">Chính sách bảo hành</h3>
            </div>
            <ul className="space-y-3 text-gray-700">
              <li className="flex gap-3"><BadgeCheck className="w-5 h-5 text-emerald-600 mt-0.5" /> Thời gian bảo hành: theo quy định từng sản phẩm (12–36 tháng).</li>
              <li className="flex gap-3"><BadgeCheck className="w-5 h-5 text-emerald-600 mt-0.5" /> Bảo hành tại hãng/điểm bảo hành ủy quyền hoặc tại AHSO.</li>
              <li className="flex gap-3"><AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" /> Không bảo hành do tác động ngoại lực, thiên tai, dùng sai điện áp/quy trình.</li>
            </ul>
          </div>

          {/* Vận chuyển */}
          <div className="bg-white rounded-2xl shadow-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-linear-to-br from-blue-600 to-cyan-600 rounded-xl flex items-center justify-center">
                <Truck className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900">Vận chuyển & nhận hàng</h3>
            </div>
            <ul className="space-y-3 text-gray-700">
              <li className="flex gap-3"><BadgeCheck className="w-5 h-5 text-blue-600 mt-0.5" /> Kiểm tra ngoại quan khi nhận: thùng hàng nguyên vẹn, không ướt/móp.</li>
              <li className="flex gap-3"><BadgeCheck className="w-5 h-5 text-blue-600 mt-0.5" /> Nếu phát hiện bất thường, vui lòng ghi nhận với đơn vị vận chuyển và liên hệ AHSO ngay.</li>
              <li className="flex gap-3"><AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" /> Hàng cồng kềnh/đặc thù có thể yêu cầu lắp đặt bởi kỹ thuật AHSO.</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Hủy đơn & thay đổi */}
      <section ref={addToRefs} className="reveal py-14 bg-linear-to-br from-gray-50 to-purple-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-6 flex items-center gap-3">
            <div className="w-12 h-12 bg-linear-to-br from-fuchsia-600 to-purple-600 rounded-xl flex items-center justify-center">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900">Hủy đơn & thay đổi thông tin</h2>
          </div>

          <div className="bg-white rounded-2xl shadow-md p-6 space-y-4 text-gray-700">
            <p>Bạn có thể yêu cầu <span className="font-semibold">hủy đơn</span> hoặc <span className="font-semibold">thay đổi địa chỉ/Thông tin xuất hóa đơn</span> trước khi đơn được bàn giao cho đơn vị vận chuyển.</p>
            <p>Vui lòng liên hệ kênh hỗ trợ để được xử lý nhanh nhất.</p>
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
            Đội ngũ chăm sóc khách hàng của AHSO sẵn sàng hỗ trợ 24/7 qua hotline, email hoặc biểu mẫu liên hệ.
          </p>

          <div className="mt-8 flex flex-wrap gap-4 justify-center">
            <Link
              href="/contact"
              className="group px-8 py-4 bg-white text-blue-600 rounded-xl font-bold shadow-2xl hover:shadow-3xl hover:scale-105 transition-all duration-300 flex items-center gap-2"
            >
              Liên hệ ngay
              {/* dùng icon chuẩn trong lib */}
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
            <span className="font-semibold">Lưu ý:</span> Chính sách có thể được cập nhật theo từng thời kỳ để phù hợp quy định pháp luật và chính sách nhà sản xuất.
          </p>
          <p>
            Ngày hiệu lực hiện tại: <span className="font-medium">01/11/2025</span>. Vui lòng tham khảo bản mới nhất trên trang chính sách của AHSO.
          </p>
        </div>
      </section>

      {/* local styles cho hiệu ứng reveal (đồng bộ style với các trang khác của bạn) */}
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
