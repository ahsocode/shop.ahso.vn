import type { Metadata } from "next";
import { draftMode } from "next/headers";
import { notFound } from "next/navigation";

import ShowcaseDetailPage from "@/components/catalog/showcase-detail-page";
import { buildMetadata } from "@/lib/metadata";
import { prisma } from "@/lib/prisma";
import type {
  solutionGetPayload,
  solutionInclude as SolutionInclude,
} from "@/lib/prisma-types";

// Chạy động, tránh build fail khi không có DB.
export const dynamic = "force-dynamic";
const SKIP_BUILD_DB = process.env.SKIP_BUILD_DB === "true";

const solutionInclude = {
  solutioncategory: { select: { name: true, slug: true } },
  solutionimage: {
    select: { id: true, url: true, alt: true, sortOrder: true },
    orderBy: { sortOrder: "asc" },
  },
} satisfies SolutionInclude;

type SolutionRecord = solutionGetPayload<{
  include: typeof solutionInclude;
}>;

type SolutionWithRelations = ReturnType<typeof transformSolution>;

function transformSolution(record: SolutionRecord) {
  const { solutioncategory, solutionimage, ...rest } = record;
  return {
    ...rest,
    category: solutioncategory,
    images: solutionimage,
  };
}

async function getSolution(
  slug: string,
  preview = false
): Promise<SolutionWithRelations | null> {
  if (!slug) return null;
  const record = await prisma.solution.findUnique({
    where: preview ? { slug } : { slug, status: "PUBLISHED" },
    include: solutionInclude,
  });
  return record ? transformSolution(record) : null;
}

function stripHtml(value?: string | null) {
  if (!value) return "";
  return value.replace(/<[^>]+>/g, "").trim();
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const { isEnabled: isPreview } = await draftMode();

  if (SKIP_BUILD_DB) {
    return buildMetadata({
      title: "Giải pháp | AHSO",
      description:
        "Chi tiết giải pháp sẽ được tải ở môi trường chạy thật.",
      path: `/solutions/${slug}`,
    });
  }

  const solution = await getSolution(slug, isPreview).catch((err) => {
    console.error("[solution metadata] DB error:", err);
    return null;
  });

  if (!solution) {
    return buildMetadata({
      title: "Giải pháp không tồn tại",
      description:
        "Nội dung bạn yêu cầu hiện không khả dụng trên AHSO Industrial.",
      path: `/solutions/${slug}`,
    });
  }

  const title = solution.metaTitle || solution.title;
  const description =
    solution.metaDescription ||
    solution.summary ||
    stripHtml(solution.bodyHtml).slice(0, 160);
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

function SolutionFallback() {
  return (
    <div className="min-h-screen bg-[oklch(0.985_0.006_250)]">
      <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="rounded-lg border border-slate-200 bg-[oklch(0.998_0.003_250)] p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-700">
            Giải pháp công nghiệp
          </p>
          <h1 className="mt-3 text-3xl font-semibold text-slate-950">
            Dữ liệu giải pháp sẽ được tải ở môi trường chạy thật.
          </h1>
          <p className="mt-3 max-w-2xl text-slate-600">
            Chế độ build đang bỏ qua kết nối cơ sở dữ liệu, giao diện sẽ hiển thị đầy đủ khi chạy với cấu hình DB hợp lệ.
          </p>
        </div>
      </div>
    </div>
  );
}

export default async function SolutionDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { isEnabled: isPreview } = await draftMode();
  if (SKIP_BUILD_DB) return <SolutionFallback />;

  let solution: SolutionWithRelations | null = null;
  try {
    solution = await getSolution(slug, isPreview);
  } catch (err) {
    console.error("[solution page] DB error:", err);
    return <SolutionFallback />;
  }

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
      url: "https://ahso.vn",
    },
    inLanguage: "vi-VN",
    keywords: [
      solution.category?.name,
      solution.industry,
      solution.usecase,
    ].filter(Boolean),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ShowcaseDetailPage
        kind="solutions"
        eyebrow="Giải pháp công nghiệp"
        title={solution.title}
        summary={solution.summary}
        cover={cover}
        category={solution.category?.name}
        isFeatured={solution.isFeatured}
        publishedAt={publishedAt}
        bodyHtml={solution.bodyHtml}
        gallery={solution.images}
        breadcrumbs={[
          { href: "/", label: "Trang chủ" },
          { href: "/solutions", label: "Giải pháp" },
          ...(solution.category
            ? [{ label: solution.category.name }]
            : []),
          { label: solution.title },
        ]}
        backHref="/solutions"
        backLabel="Quay lại danh sách giải pháp"
        contentTitle="Mô tả giải pháp"
        emptyContent="Nội dung đang được cập nhật. Vui lòng liên hệ đội ngũ AHSO để nhận tài liệu chi tiết và phương án tư vấn phù hợp."
        ctaLabel="Nhận tư vấn triển khai"
        supportTitle="Cần làm rõ bài toán?"
        supportDescription="AHSO có thể trao đổi nhanh để xác định phạm vi, hiện trạng dây chuyền và hướng triển khai phù hợp trước khi báo giá."
        facts={[
          { label: "Danh mục", value: solution.category?.name },
          { label: "Ngành ứng dụng", value: solution.industry },
          { label: "Bài toán", value: solution.usecase },
        ]}
      />
    </>
  );
}
