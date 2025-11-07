import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { ArrowLeft, Home, Tag } from "lucide-react";
import ShareButton from "@/components/ui/share-button";
import SimilarSoftwareCarousel from "./SimilarSoftwareCarousel";

export const revalidate = 60;

async function getSoftwareBySlug(slug: string) {
  const row = await prisma.software.findUnique({
    where: { slug },
    select: {
      id: true, slug: true, title: true, summary: true, coverImage: true, bodyHtml: true,
      metaTitle: true, metaDescription: true, canonicalUrl: true,
      status: true,
      category: { select: { id: true, slug: true, name: true } },
    },
  });
  return row && row.status === "PUBLISHED" ? row : null;
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params;
  const s = await getSoftwareBySlug(decodeURIComponent(slug));
  if (!s) return { title: "Phần mềm - Không tìm thấy" };

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

export default async function SoftwareDetailPage(
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const s = await getSoftwareBySlug(decodeURIComponent(slug));
  if (!s) notFound();

  const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://ahso.vn";
  const shareUrl = `${BASE_URL}/software/${s.slug}`;
  const coverSrc = s.coverImage ?? "/logo.png";

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb + Back */}
      <div className="mb-6 flex flex-wrap items-center gap-3 text-sm text-gray-600">
        <Link href="/" className="inline-flex items-center gap-1 hover:text-gray-900">
          <Home className="h-4 w-4" /> Trang chủ
        </Link>
        <span className="text-gray-400">/</span>
        <Link href="/shop/software" className="hover:text-gray-900">
          Phần mềm & Dịch vụ
        </Link>
        <span className="text-gray-400">/</span>
        <span className="font-medium text-gray-900 line-clamp-1">{s.title}</span>

        <div className="ml-auto">
          <Link
            href="/shop/software"
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

        <div className="mt-4 flex flex-wrap gap-2">
          {s.category?.name && (
            <span className="inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs text-gray-700">
              <Tag className="h-3.5 w-3.5" />
              Danh mục: <strong className="ml-1">{s.category.name}</strong>
            </span>
          )}
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href="/contact"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white shadow hover:bg-blue-700"
          >
            Liên hệ tư vấn
          </Link>
          <ShareButton url={shareUrl} title={s.title} />
        </div>
      </header>

      {/* Cover + Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-gray-100">
            <Image src={coverSrc} alt={s.title} fill className="object-cover" />
          </div>

          <article className="prose prose-blue max-w-none mt-6">
            <div dangerouslySetInnerHTML={{ __html: s.bodyHtml }} />
          </article>
        </div>

        <aside className="lg:col-span-1 space-y-4">
          <div className="rounded-xl border bg-white p-4 shadow-sm">
            <h3 className="font-semibold">Thông tin</h3>
            <dl className="mt-3 text-sm text-gray-700 space-y-1">
              {s.category?.name && (
                <div className="flex gap-2">
                  <dt className="text-gray-500 min-w-20">Danh mục</dt>
                  <dd className="flex-1 truncate">{s.category.name}</dd>
                </div>
              )}
            </dl>
          </div>
        </aside>
      </div>

      {/* Similar */}
      <section className="mt-10">
        <h2 className="text-xl font-semibold mb-4">Phần mềm tương tự</h2>
        <SimilarSoftwareCarousel category={s.category} excludeSlug={s.slug} />
      </section>
    </div>
  );
}
