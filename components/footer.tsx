import Image from "next/image";
import Link from "next/link";
import {
  ArrowUpRight,
  Building2,
  Mail,
  MapPin,
  Phone,
} from "lucide-react";

type FooterLink = {
  label: string;
  href: string;
  external?: boolean;
};

const footerLinks: Array<{ title: string; links: FooterLink[] }> = [
  {
    title: "Khám phá",
    links: [
      { label: "Trang chủ", href: "/" },
      { label: "Giải pháp", href: "/solutions" },
      { label: "Phần mềm", href: "/software" },
      { label: "Về AHSO", href: "/about" },
    ],
  },
  {
    title: "Hỗ trợ",
    links: [
      { label: "Liên hệ tư vấn", href: "/contact" },
      { label: "Chính sách", href: "/policy" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-slate-950 text-slate-300">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr_1fr]">
          <div className="max-w-xl">
            <Link href="/" className="inline-flex items-center gap-3 text-white">
              <Image
                src="/logo.png"
                alt="AHSO"
                width={42}
                height={42}
                className="h-10 w-10 object-contain"
              />
              <span className="text-lg font-semibold">AHSO Industrial</span>
            </Link>
            <p className="mt-5 text-sm leading-7 text-slate-400">
              AHSO cung cấp giải pháp và phần mềm công nghiệp, tập trung vào tự động hóa,
              giám sát vận hành, tối ưu quy trình và triển khai theo nhu cầu thực tế của
              nhà máy.
            </p>
            <Link
              href="/contact"
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
            >
              Trao đổi với AHSO
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-1">
            {footerLinks.map((group) => (
              <div key={group.title}>
                <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-white">
                  {group.title}
                </h2>
                <ul className="mt-4 grid gap-3">
                  {group.links.map((item) => (
                    <li key={item.label}>
                      <Link
                        href={item.href}
                        target={item.external ? "_blank" : undefined}
                        rel={item.external ? "noopener noreferrer" : undefined}
                        className="inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-white"
                      >
                        {item.label}
                        {item.external && <ArrowUpRight className="h-3.5 w-3.5" />}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div>
            <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-white">
              Thông tin liên hệ
            </h2>
            <ul className="mt-4 grid gap-4 text-sm text-slate-400">
              <li className="flex gap-3">
                <Building2 className="mt-0.5 h-5 w-5 shrink-0 text-blue-300" />
                <span>CÔNG TY TNHH AHSO</span>
              </li>
              <li className="flex gap-3">
                <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-blue-300" />
                <span>
                  39/15 Đường Cao Bá Quát, Khu phố Đông Tân, Phường Dĩ An,
                  Thành phố Hồ Chí Minh, Việt Nam.
                </span>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="h-5 w-5 shrink-0 text-blue-300" />
                <a href="tel:0901951351" className="transition hover:text-white">
                  0901 951 351
                </a>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="h-5 w-5 shrink-0 text-blue-300" />
                <a href="mailto:sales@ahso.vn" className="transition hover:text-white">
                  sales@ahso.vn
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 grid gap-5 border-t border-white/10 pt-6 text-xs text-slate-500 md:grid-cols-[1fr_auto] md:items-center">
          <p>
            © {new Date().getFullYear()} AHSO Industrial. Tất cả quyền được bảo lưu.
          </p>
          <Link
            href="http://online.gov.vn/Home/WebDetails/95738"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-fit items-center gap-3 transition hover:opacity-90"
          >
            <Image
              src="/bo-cong-thuong.png"
              alt="Đã đăng ký với Bộ Công Thương"
              width={150}
              height={57}
              className="h-10 w-auto object-contain"
            />
          </Link>
        </div>
      </div>
    </footer>
  );
}
