import Image from "next/image";
import Link from "next/link";

type NotFoundPageProps = {
  title?: string;
  description?: string;
  primaryHref?: string;
  primaryLabel?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
};

export default function NotFoundPage({
  title = "Không tìm thấy trang",
  description = "Liên kết bạn truy cập không còn tồn tại hoặc đã được chuyển sang nơi khác.",
  primaryHref = "/",
  primaryLabel = "Về trang chủ",
  secondaryHref = "/shop/products",
  secondaryLabel = "Xem sản phẩm",
}: NotFoundPageProps) {
  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <div className="pointer-events-none absolute -left-20 top-10 h-56 w-56 rounded-full bg-blue-200/40 blur-3xl" />
      <div className="pointer-events-none absolute -right-16 bottom-10 h-64 w-64 rounded-full bg-amber-200/40 blur-3xl" />

      <div className="mx-auto flex min-h-[70vh] max-w-5xl items-center px-4 py-16">
        <div className="grid w-full gap-8 rounded-3xl border border-slate-200 bg-white/80 p-8 shadow-xl backdrop-blur md:grid-cols-[200px_minmax(0,1fr)] md:p-12">
          <div className="flex flex-col items-center justify-center gap-4">
            <div className="relative h-20 w-20 overflow-hidden rounded-2xl bg-white shadow-sm">
              <Image src="/logo.png" alt="AHSO" fill sizes="80px" className="object-contain p-2" />
            </div>
            <div className="text-center">
              <div className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                Error
              </div>
              <div className="mt-1 text-4xl font-bold text-slate-900">404</div>
            </div>
          </div>

          <div className="flex flex-col justify-center gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-slate-900 md:text-3xl">{title}</h1>
              <p className="mt-2 text-sm text-slate-600 md:text-base">{description}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href={primaryHref}
                className="inline-flex items-center justify-center rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow hover:bg-blue-700"
              >
                {primaryLabel}
              </Link>
              <Link
                href={secondaryHref}
                className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:border-blue-200 hover:text-blue-700"
              >
                {secondaryLabel}
              </Link>
            </div>
            <div className="text-xs text-slate-400">
              Nếu bạn cần hỗ trợ, hãy liên hệ đội ngũ AHSO để được hướng dẫn nhanh nhất.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
