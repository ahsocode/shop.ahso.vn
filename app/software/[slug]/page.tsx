import type { Metadata } from "next";
import { draftMode } from "next/headers";
import { notFound } from "next/navigation";

import ShowcaseDetailPage from "@/components/catalog/showcase-detail-page";
import { buildMetadata } from "@/lib/metadata";
import { prisma } from "@/lib/prisma";
import type {
  softwareGetPayload,
  softwareInclude as SoftwareInclude,
} from "@/lib/prisma-types";

// Chạy động, tránh build fail khi không có DB.
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

async function getSoftware(
  slug: string,
  preview = false
): Promise<SoftwareWithRelations | null> {
  if (!slug) return null;
  const record = await prisma.software.findUnique({
    where: preview ? { slug } : { slug, status: "PUBLISHED" },
    include: softwareInclude,
  });
  return record ? transformSoftware(record) : null;
}

function stripHtml(value?: string | null) {
  if (!value) return "";
  return value.replace(/<[^>]+>/g, "").trim();
}

function SoftwareFallback() {
  return (
    <div className="min-h-screen bg-[oklch(0.985_0.006_250)]">
      <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="rounded-lg border border-slate-200 bg-[oklch(0.998_0.003_250)] p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-700">
            Phần mềm công nghiệp
          </p>
          <h1 className="mt-3 text-3xl font-semibold text-slate-950">
            Dữ liệu phần mềm sẽ được tải ở môi trường chạy thật.
          </h1>
          <p className="mt-3 max-w-2xl text-slate-600">
            Chế độ build đang bỏ qua kết nối cơ sở dữ liệu, giao diện sẽ hiển thị đầy đủ khi chạy với cấu hình DB hợp lệ.
          </p>
        </div>
      </div>
    </div>
  );
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
      title: "Phần mềm | AHSO",
      description:
        "Chi tiết phần mềm sẽ được tải ở môi trường chạy thật.",
      path: `/software/${slug}`,
    });
  }

  const software = await getSoftware(slug, isPreview).catch((err) => {
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
    stripHtml(software.bodyHtml).slice(0, 160);
  const image = software.coverImage || "/logo.png";
  const keywords = [software.title, software.category?.name].filter(
    Boolean
  ) as string[];

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
  const { isEnabled: isPreview } = await draftMode();
  if (SKIP_BUILD_DB) return <SoftwareFallback />;

  let software: SoftwareWithRelations | null = null;
  try {
    software = await getSoftware(slug, isPreview);
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
    description: software.summary || stripHtml(software.bodyHtml).slice(0, 160),
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
      url: "https://ahso.vn",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ShowcaseDetailPage
        kind="software"
        eyebrow="Phần mềm công nghiệp"
        title={software.title}
        summary={software.summary}
        cover={cover}
        category={software.category?.name}
        isFeatured={software.isFeatured}
        publishedAt={publishedAt}
        bodyHtml={software.bodyHtml}
        breadcrumbs={[
          { href: "/", label: "Trang chủ" },
          { href: "/software", label: "Phần mềm" },
          ...(software.category
            ? [{ label: software.category.name }]
            : []),
          { label: software.title },
        ]}
        backHref="/software"
        backLabel="Quay lại danh sách phần mềm"
        contentTitle="Thông tin chi tiết"
        emptyContent="Nội dung đang được cập nhật. Vui lòng liên hệ đội ngũ AHSO để nhận tài liệu chi tiết và lộ trình triển khai."
        ctaLabel="Nhận tư vấn demo"
        supportTitle="Cần đánh giá khả năng áp dụng?"
        supportDescription="AHSO có thể trao đổi nhanh về quy trình hiện tại, dữ liệu đầu vào và yêu cầu vận hành trước khi đề xuất phần mềm phù hợp."
        facts={[
          { label: "Danh mục", value: software.category?.name },
          { label: "Phạm vi", value: "Tư vấn, triển khai và hỗ trợ vận hành" },
        ]}
      />
    </>
  );
}
