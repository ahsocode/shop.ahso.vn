import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { ArrowLeft, Home, Phone, Mail, MessageCircle, Tag, Factory } from "lucide-react";
import ShareButton from "@/components/ui/share-button";
import SimilarProductsCarousel from "./SimilarSolutionsCarousel"; 
import SimilarSolutionsCarousel from "./SimilarSolutionsCarousel";

export const revalidate = 60;

async function getSolutionBySlug(slug: string) {
  const row = await prisma.solution.findUnique({
    where: { slug },
    select: {
      id: true, slug: true, title: true, summary: true, coverImage: true, bodyHtml: true,
      industry: true, usecase: true, metaTitle: true, metaDescription: true, canonicalUrl: true,
      status: true,
      category: { select: { id: true, slug: true, name: true } },
      images: { select: { id: true, url: true, alt: true, sortOrder: true }, orderBy: { sortOrder: "asc" } },
    },
  });
  return row && row.status === "PUBLISHED" ? row : null;
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params;
  const s = await getSolutionBySlug(decodeURIComponent(slug));
  if (!s) return { title: "Giải pháp - Không tìm thấy" };

  const ogImage = s.coverImage ?? "/logo.png";

  return {
    title: s.metaTitle ?? s.title,
    description: s.metaDescription ?? s.summary ?? undefined,
    alternates: s.canonicalUrl ? { canonical: s.canonicalUrl } : undefined,
    openGraph: {
      title: s.metaTitle ?? s.title,
      description: s.metaDescription ?? s.summary ?? undefined,
      images: [{ url: ogImage }],
      type: "article",
    },
  };
}

export default async function SolutionDetailPage(
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const s = await getSolutionBySlug(decodeURIComponent(slug));
  if (!s) notFound();

  const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://ahso.vn";
  const shareUrl = `${BASE_URL}/solutions/${s.slug}`;
  const coverSrc = s.coverImage ?? "/logo.png";

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb + Back */}
      <div className="mb-6 flex flex-wrap items-center gap-3 text-sm text-gray-600">
        <Link href="/" className="inline-flex items-center gap-1 hover:text-gray-900">
          <Home className="h-4 w-4" /> Trang chủ
        </Link>
        <span className="text-gray-400">/</span>
        <Link href="/solutions" className="hover:text-gray-900">
          Giải pháp
        </Link>
        <span className="text-gray-400">/</span>
        <span className="font-medium text-gray-900 line-clamp-1">{s.title}</span>

        <div className="ml-auto">
          <Link
            href="/solutions"
            className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 hover:bg-gray-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Quay lại danh sách
          </Link>
        </div>
      </div>

      {/* Header */}
      <header className="mb-6">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">{s.title}</h1>
        {s.summary && <p className="mt-3 text-base md:text-lg text-gray-700">{s.summary}</p>}

        {/* Chips */}
        <div className="mt-4 flex flex-wrap gap-2">
          {s.category?.name && (
            <span className="inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs text-gray-700">
              <Tag className="h-3.5 w-3.5" />
              Danh mục: <strong className="ml-1">{s.category.name}</strong>
            </span>
          )}
          {s.industry && (
            <span className="inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs text-gray-700">
              <Factory className="h-3.5 w-3.5" />
              Ngành: <strong className="ml-1">{s.industry}</strong>
            </span>
          )}
          {s.usecase && (
            <span className="inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs text-gray-700">
              Phân loại: <strong className="ml-1">{s.usecase}</strong>
            </span>
          )}
        </div>

        {/* CTA buttons */}
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href="/contact"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white shadow-sm hover:bg-blue-700"
          >
            <Phone className="h-5 w-5" />
            Liên hệ tư vấn
          </Link>
          <a
            href="mailto:sales@ahso.vn?subject=Quan%20t%C3%A2m%20gi%E1%BA%A3i%20ph%C3%A1p&body=Ch%C3%A0o%20AHSO%2C%0AT%C3%B4i%20quan%20t%C3%A2m%20gi%E1%BA%A3i%20ph%C3%A1p%3A%20"
            className="inline-flex items-center justify-center gap-2 rounded-xl border px-5 py-3 font-semibold hover:bg-gray-50"
          >
            <Mail className="h-5 w-5" />
            Gửi email
          </a>
          <a
            href="https://zalo.me/0847080303"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-xl border px-5 py-3 font-semibold hover:bg-gray-50"
          >
            <MessageCircle className="h-5 w-5" />
            Chat Zalo
          </a>

          <ShareButton
            title={s.title}
            summary={s.summary}
            url={shareUrl}
            className="inline-flex items-center justify-center gap-2 rounded-xl border px-5 py-3 font-semibold hover:bg-gray-50"
          />
        </div>
      </header>

      {/* Content layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main */}
        <div className="lg:col-span-2">
          {/* Cover */}
          <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
            <Image
              src={coverSrc}
              alt={s.title}
              width={1200}
              height={630}
              className="h-auto w-full object-cover"
              priority
            />
          </div>

          {/* Gallery */}
          {s.images?.length ? (
            <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-3">
              {s.images.map((img) => {
                const src = img.url || "/logo.png";
                const alt = img.alt ?? s.title;
                return (
                  <div key={img.id} className="overflow-hidden rounded-xl border bg-white">
                    <img
                      src={src}
                      alt={alt}
                      className="h-40 w-full object-cover transition-transform duration-300 hover:scale-105"
                      loading="lazy"
                    />
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="mt-4 rounded-xl border bg-white p-6 flex items-center gap-4">
              <img src="/logo.png" alt="AHSO" className="h-14 w-14 object-contain" />
              <p className="text-gray-700">Chưa có hình ảnh minh hoạ cho giải pháp này.</p>
            </div>
          )}

          {/* Body */}
          <article
            className="prose prose-gray max-w-none prose-headings:scroll-mt-24 prose-a:text-blue-600 hover:prose-a:underline mt-6"
            dangerouslySetInnerHTML={{ __html: s.bodyHtml }}
          />

          {/* Bottom CTA */}
          <div className="mt-8 rounded-2xl border bg-linear-to-br from-blue-50 to-indigo-50 p-6">
            <h3 className="text-lg font-semibold">Bạn cần demo / báo giá cho giải pháp này?</h3>
            <p className="mt-1 text-gray-700">
              Đội ngũ AHSO sẵn sàng tư vấn, khảo sát và đề xuất cấu hình phù hợp với quy trình của bạn.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white font-semibold hover:bg-blue-700"
              >
                <Phone className="h-4 w-4" />
                Đặt lịch tư vấn
              </Link>
              <a
                href="mailto:sales@ahso.vn"
                className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 font-semibold hover:bg-white/60"
              >
                <Mail className="h-4 w-4" />
                Yêu cầu báo giá
              </a>
            </div>
          </div>

          {/* 🔽 Sản phẩm liên quan: slide tự động */}
          <div className="mt-12">
  <h2 className="text-2xl font-bold mb-4">Giải pháp cùng ngành</h2>
  <SimilarSolutionsCarousel industry={s.industry} excludeSlug={s.slug} />
</div>

        </div>

        {/* Sidebar */}
        <aside className="lg:col-span-1">
          <div className="sticky top-24 space-y-4">
            <div className="rounded-2xl border bg-white p-5 shadow-sm">
              <h3 className="text-base font-semibold">Thông tin nhanh</h3>
              <dl className="mt-3 space-y-2 text-sm">
                {s.category?.name && (
                  <div className="flex justify-between gap-3">
                    <dt className="text-gray-500">Danh mục</dt>
                    <dd className="font-medium text-gray-900">{s.category.name}</dd>
                  </div>
                )}
                {s.industry && (
                  <div className="flex justify-between gap-3">
                    <dt className="text-gray-500">Ngành áp dụng</dt>
                    <dd className="font-medium text-gray-900">{s.industry}</dd>
                  </div>
                )}
                {s.usecase && (
                  <div className="flex justify-between gap-3">
                    <dt className="text-gray-500">Phân loại</dt>
                    <dd className="font-medium text-gray-900">{s.usecase}</dd>
                  </div>
                )}
              </dl>
              <div className="mt-4 grid grid-cols-1 gap-2">
                <Link
                  href="/contact"
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white font-semibold hover:bg-blue-700"
                >
                  <Phone className="h-4 w-4" />
                  Liên hệ ngay
                </Link>
                <a
                  href="mailto:sales@ahso.vn"
                  className="inline-flex items-center justify-center gap-2 rounded-lg border px-4 py-2 font-semibold hover:bg-gray-50"
                >
                  <Mail className="h-4 w-4" />
                  Gửi email
                </a>
                <a
                  href="https://zalo.me/0847080303"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-lg border px-4 py-2 font-semibold hover:bg-gray-50"
                >
                  <MessageCircle className="h-4 w-4" />
                  Chat Zalo
                </a>
              </div>
            </div>

            <div className="rounded-2xl border bg-white p-5 shadow-sm">
              <h3 className="text-base font-semibold">Tài liệu & liên kết</h3>
              <ul className="mt-3 list-disc pl-5 text-sm text-gray-700 space-y-2">
                {s.canonicalUrl && (
                  <li>
                    <a
                      href={s.canonicalUrl}
                      className="text-blue-600 hover:underline"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Liên kết canonical
                    </a>
                  </li>
                )}
                <li>
                  <Link href="/shop/solutions" className="text-blue-600 hover:underline">
                    Xem thêm các giải pháp khác
                  </Link>
                </li>
                <li>
                  <Link href="/" className="text-blue-600 hover:underline">
                    Quay lại trang chủ
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
