import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { buildMetadata } from "@/lib/metadata";

export const revalidate = 60;

const solutionInclude = Prisma.validator<Prisma.SolutionInclude>()({
  category: { select: { name: true, slug: true } },
  images: {
    select: { id: true, url: true, alt: true, sortOrder: true },
    orderBy: { sortOrder: "asc" },
  },
});

type SolutionWithRelations = Prisma.SolutionGetPayload<{
  include: typeof solutionInclude;
}>;

async function getSolution(slug: string): Promise<SolutionWithRelations | null> {
  if (!slug) return null;
  return prisma.solution.findUnique({
    where: { slug, status: "PUBLISHED" },
    include: solutionInclude,
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const solution = await getSolution(slug);
  if (!solution) {
    return buildMetadata({
      title: "Giải pháp không tồn tại",
      description: "Nội dung bạn yêu cầu hiện không khả dụng trên AHSO Shop.",
      path: `/solutions/${slug}`,
    });
  }

  const title = solution.metaTitle || solution.title;
  const description =
    solution.metaDescription ||
    solution.summary ||
    solution.bodyHtml?.replace(/<[^>]+>/g, "").slice(0, 160) ||
    "";
  const image = solution.coverImage || solution.images[0]?.url || "/logo.png";
  const keywords = [
    solution.title,
    solution.category?.name,
    solution.industry,
    solution.usecase,
  ].filter(Boolean) as string[];

  return buildMetadata({
    title,
    description,
    path: `/solutions/${slug}`,
    image,
    keywords: keywords.length ? keywords : undefined,
  });
}

function stripHtml(value?: string | null) {
  if (!value) return "";
  return value.replace(/<[^>]+>/g, "").trim();
}

export default async function SolutionDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const solution = await getSolution(slug);
  if (!solution) notFound();

  const cover = solution.coverImage || solution.images[0]?.url || "/logo.png";
  const publishedAt = solution.publishedAt ?? solution.createdAt;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: solution.title,
    headline: solution.summary || stripHtml(solution.bodyHtml).slice(0, 110),
    datePublished: publishedAt?.toISOString(),
    dateModified: solution.updatedAt?.toISOString(),
    image: cover,
    author: {
      "@type": "Organization",
      name: "AHSO Industrial",
      url: "https://shop.ahso.vn",
    },
    inLanguage: "vi-VN",
    keywords: [
      solution.category?.name,
      solution.industry,
      solution.usecase,
    ].filter(Boolean),
  };

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <nav className="text-sm text-gray-600 mb-6 flex flex-wrap items-center gap-2">
        <Link href="/" className="hover:text-gray-900">
          Trang chủ
        </Link>
        <span className="text-gray-400">/</span>
        <Link href="/solutions" className="hover:text-gray-900">
          Giải pháp
        </Link>
        {solution.category && (
          <>
            <span className="text-gray-400">/</span>
            <span className="text-gray-900">{solution.category.name}</span>
          </>
        )}
        <span className="text-gray-400">/</span>
        <span className="font-medium text-gray-900">{solution.title}</span>
      </nav>

      <header className="space-y-4">
        <p className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-600">
          Giải pháp công nghiệp
        </p>
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">
          {solution.title}
        </h1>
        {solution.summary && (
          <p className="text-lg text-gray-600 max-w-3xl">{solution.summary}</p>
        )}
      </header>

      <div className="mt-8 grid gap-8 lg:grid-cols-[2fr,1fr]">
        <div>
          <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-gray-100">
            <Image src={cover} alt={solution.title} fill className="object-cover" />
          </div>
        </div>
        <aside className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Thông tin nhanh
          </h2>
          <dl className="space-y-3 text-sm text-gray-700">
            {solution.category && (
              <div className="flex justify-between gap-4">
                <dt className="text-gray-500">Danh mục</dt>
                <dd className="text-right">{solution.category.name}</dd>
              </div>
            )}
            {solution.industry && (
              <div className="flex justify-between gap-4">
                <dt className="text-gray-500">Ngành</dt>
                <dd className="text-right">{solution.industry}</dd>
              </div>
            )}
            {solution.usecase && (
              <div className="flex justify-between gap-4">
                <dt className="text-gray-500">Use case</dt>
                <dd className="text-right">{solution.usecase}</dd>
              </div>
            )}
            {publishedAt && (
              <div className="flex justify-between gap-4">
                <dt className="text-gray-500">Cập nhật</dt>
                <dd className="text-right">
                  {publishedAt.toLocaleDateString("vi-VN")}
                </dd>
              </div>
            )}
          </dl>
          <div className="pt-4">
            <Link
              href="/contact"
              className="inline-flex w-full items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-700"
            >
              Nhận tư vấn triển khai
            </Link>
          </div>
        </aside>
      </div>

      {solution.images.length > 1 && (
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {solution.images.slice(1).map((img) => (
            <div
              key={img.id}
              className="relative aspect-video overflow-hidden rounded-xl bg-gray-100"
            >
              <Image
                src={img.url}
                alt={img.alt || solution.title}
                fill
                className="object-cover"
              />
            </div>
          ))}
        </div>
      )}

      <section className="mt-10 rounded-2xl bg-white p-6 shadow-md space-y-6">
        <h2 className="text-2xl font-semibold text-gray-900">
          Mô tả giải pháp
        </h2>
        {solution.bodyHtml ? (
          <div
            className="prose max-w-none prose-blue"
            dangerouslySetInnerHTML={{ __html: solution.bodyHtml }}
          />
        ) : (
          <p className="text-gray-600">
            Nội dung đang được cập nhật. Vui lòng liên hệ đội ngũ AHSO để nhận
            tài liệu chi tiết.
          </p>
        )}
      </section>
    </div>
  );
}
