import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { buildMetadata } from "@/lib/metadata";
import type { softwareInclude as SoftwareInclude, softwareGetPayload } from "@/lib/prisma-types";

// Chạy động, tránh build fail khi không có DB
export const dynamic = "force-dynamic";
const SKIP_BUILD_DB = process.env.SKIP_BUILD_DB === "true";

const softwareInclude = {
  softwarecategory: { select: { name: true, slug: true } },
} satisfies SoftwareInclude;

type SoftwareRecord = softwareGetPayload<{
  include: typeof softwareInclude;
}>;

type SoftwareWithRelations = ReturnType<typeof transformSoftware>;

function transformSoftware(record: SoftwareRecord) {
  const { softwarecategory, ...rest } = record;
  return {
    ...rest,
    category: softwarecategory,
  };
}

async function getSoftware(slug: string): Promise<SoftwareWithRelations | null> {
  if (!slug) return null;
  const record = await prisma.software.findUnique({
    where: { slug, status: "PUBLISHED" },
    include: softwareInclude,
  });
  return record ? transformSoftware(record) : null;
}

function SoftwareFallback() {
  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-10 text-gray-700">
      <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">
        Thông tin phần mềm
      </h1>
      <p className="text-gray-600">
        Dữ liệu sẽ được tải ở môi trường chạy thật. (CI đang skip DB khi build.)
      </p>
    </div>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  if (SKIP_BUILD_DB) {
    return buildMetadata({
      title: "Phần mềm | AHSO",
      description: "Chi tiết phần mềm sẽ được tải ở môi trường chạy thật.",
      path: `/software/${slug}`,
    });
  }

  const software = await getSoftware(slug).catch((err) => {
    console.error("[software metadata] DB error:", err);
    return null;
  });
  if (!software) {
    return buildMetadata({
      title: "Phần mềm không tồn tại",
      description: "Không tìm thấy thông tin phần mềm bạn yêu cầu.",
      path: `/software/${slug}`,
    });
  }

  const title = software.metaTitle || software.title;
  const description =
    software.metaDescription ||
    software.summary ||
    software.bodyHtml?.replace(/<[^>]+>/g, "").slice(0, 160) ||
    "";
  const image = software.coverImage || "/logo.png";
  const keywords = [
    software.title,
    software.category?.name,
  ].filter(Boolean) as string[];

  return buildMetadata({
    title,
    description,
    path: `/software/${slug}`,
    image,
    keywords: keywords.length ? keywords : undefined,
  });
}

export default async function SoftwareDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (SKIP_BUILD_DB) return <SoftwareFallback />;

  let software: SoftwareWithRelations | null = null;
  try {
    software = await getSoftware(slug);
  } catch (err) {
    console.error("[software page] DB error:", err);
    return <SoftwareFallback />;
  }
  if (!software) notFound();

  const cover = software.coverImage || "/logo.png";
  const publishedAt = software.publishedAt ?? software.createdAt;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: software.title,
    applicationCategory: software.category?.name,
    operatingSystem: "Cloud",
    description: software.summary,
    image: cover,
    inLanguage: "vi-VN",
    datePublished: publishedAt?.toISOString(),
    dateModified: software.updatedAt?.toISOString(),
    offers: {
      "@type": "Offer",
      availability: "https://schema.org/InStock",
      price: "0",
      priceCurrency: "VND",
    },
    provider: {
      "@type": "Organization",
      name: "AHSO Industrial",
      url: "https://shop.ahso.vn",
    },
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
        <Link href="/software" className="hover:text-gray-900">
          Phần mềm & dịch vụ
        </Link>
        <span className="text-gray-400">/</span>
        <span className="font-medium text-gray-900">{software.title}</span>
      </nav>

      <header className="space-y-3">
        <p className="text-sm font-semibold text-blue-600">
          Giải pháp phần mềm
        </p>
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">
          {software.title}
        </h1>
        {software.summary && (
          <p className="text-lg text-gray-600 max-w-3xl">{software.summary}</p>
        )}
      </header>

      <div className="mt-8 grid gap-8 lg:grid-cols-[2fr,1fr]">
        <div>
          <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-gray-100">
            <Image src={cover} alt={software.title} fill className="object-cover" />
          </div>
        </div>
        <aside className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Thông tin triển khai
          </h2>
          <dl className="space-y-3 text-sm text-gray-700">
            {software.category && (
              <div className="flex justify-between gap-4">
                <dt className="text-gray-500">Danh mục</dt>
                <dd className="text-right">{software.category.name}</dd>
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
              Nhận tư vấn demo
            </Link>
          </div>
        </aside>
      </div>

      <section className="mt-10 rounded-2xl bg-white p-6 shadow-md space-y-6">
        <h2 className="text-2xl font-semibold text-gray-900">
          Thông tin chi tiết
        </h2>
        {software.bodyHtml ? (
          <div
            className="prose max-w-none prose-blue"
            dangerouslySetInnerHTML={{ __html: software.bodyHtml }}
          />
        ) : (
          <p className="text-gray-600">
            Nội dung đang được cập nhật. Vui lòng liên hệ đội ngũ AHSO để nhận
            tài liệu chi tiết và lộ trình triển khai.
          </p>
        )}
      </section>
    </div>
  );
}
