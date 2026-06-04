import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Layers3,
  Star,
} from "lucide-react";

import { cn } from "@/lib/utils";

type BreadcrumbItem = {
  href?: string;
  label: string;
};

type DetailFact = {
  label: string;
  value?: string | null;
};

type DetailImage = {
  id: string;
  url: string;
  alt?: string | null;
};

type ShowcaseDetailPageProps = {
  kind: "solutions" | "software";
  eyebrow: string;
  title: string;
  summary?: string | null;
  cover: string;
  category?: string | null;
  isFeatured?: boolean | null;
  publishedAt?: Date | null;
  bodyHtml?: string | null;
  gallery?: DetailImage[];
  facts?: DetailFact[];
  breadcrumbs: BreadcrumbItem[];
  backHref: string;
  backLabel: string;
  contentTitle: string;
  emptyContent: string;
  ctaLabel: string;
  supportTitle: string;
  supportDescription: string;
};

const PROCESS_COPY = [
  "Làm rõ nhu cầu và điều kiện vận hành.",
  "Đề xuất phương án phù hợp với hiện trạng.",
  "Thống nhất phạm vi, báo giá và kế hoạch triển khai.",
];

export default function ShowcaseDetailPage({
  kind,
  eyebrow,
  title,
  summary,
  cover,
  category,
  isFeatured,
  publishedAt,
  bodyHtml,
  gallery = [],
  facts = [],
  breadcrumbs,
  backHref,
  backLabel,
  contentTitle,
  emptyContent,
  ctaLabel,
  supportTitle,
  supportDescription,
}: ShowcaseDetailPageProps) {
  const validFacts = facts.filter((fact) => Boolean(fact.value));
  const galleryItems = gallery.filter((image) => image.url !== cover);
  const detailLabel = kind === "solutions" ? "Giải pháp" : "Phần mềm";

  return (
    <main className="min-h-screen bg-[oklch(0.985_0.006_250)] text-slate-950">
      <section className="border-b border-slate-200/80 bg-[oklch(0.992_0.004_250)]/94">
        <div className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
          <nav
            aria-label="Đường dẫn"
            className="flex flex-wrap items-center gap-2 text-sm text-slate-500"
          >
            {breadcrumbs.map((item, index) => (
              <span key={`${item.label}-${index}`} className="flex items-center gap-2">
                {index > 0 ? <span className="text-slate-300">/</span> : null}
                {item.href ? (
                  <Link href={item.href} className="transition-colors hover:text-blue-700">
                    {item.label}
                  </Link>
                ) : (
                  <span className="font-medium text-slate-700">{item.label}</span>
                )}
              </span>
            ))}
          </nav>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_44%] lg:px-8 lg:py-12">
        <div className="flex flex-col justify-center">
          <Link
            href={backHref}
            className="mb-6 inline-flex w-fit items-center gap-2 text-sm font-semibold text-slate-600 transition-colors hover:text-blue-700"
          >
            <ArrowLeft className="h-4 w-4" />
            {backLabel}
          </Link>

          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
              <Layers3 className="h-3.5 w-3.5" />
              {eyebrow}
            </span>
            {isFeatured ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-amber-900">
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-600" />
                Nổi bật
              </span>
            ) : null}
          </div>

          <h1 className="mt-5 max-w-4xl text-4xl font-semibold leading-tight tracking-normal text-slate-950 sm:text-5xl">
            {title}
          </h1>
          {summary ? (
            <p className="mt-5 max-w-3xl text-base leading-7 text-slate-600 sm:text-lg">
              {summary}
            </p>
          ) : null}

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link
              href="/contact"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-blue-600 px-5 text-sm font-semibold text-white shadow transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-600"
            >
              {ctaLabel}
              <ArrowRight className="h-4 w-4" />
            </Link>
            {category ? (
              <span className="inline-flex h-10 items-center rounded-md border border-slate-200 bg-[oklch(0.998_0.003_250)] px-4 text-sm font-medium text-slate-700">
                {category}
              </span>
            ) : null}
          </div>
        </div>

        <div className="relative overflow-hidden rounded-lg border border-slate-200 bg-[oklch(0.998_0.003_250)] shadow-sm">
          <div className="relative aspect-[4/3] w-full bg-slate-100">
            <Image
              src={cover}
              alt={title}
              fill
              priority
              className={cn(
                "p-2",
                kind === "software" ? "object-contain" : "object-cover"
              )}
              sizes="(min-width: 1024px) 44vw, 100vw"
            />
          </div>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-7xl gap-8 px-4 pb-12 sm:px-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:px-8 lg:pb-16">
        <div className="space-y-6">
          {galleryItems.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {galleryItems.map((image) => (
                <div
                  key={image.id}
                  className="relative aspect-[4/3] overflow-hidden rounded-lg border border-slate-200 bg-[oklch(0.998_0.003_250)]"
                >
                  <Image
                    src={image.url}
                    alt={image.alt || title}
                    fill
                    className="object-contain p-2"
                    sizes="(min-width: 1024px) 420px, 100vw"
                  />
                </div>
              ))}
            </div>
          ) : null}

          <article className="rounded-lg border border-slate-200 bg-[oklch(0.998_0.003_250)] p-5 shadow-sm sm:p-7">
            <div className="mb-6 flex items-center justify-between gap-4 border-b border-slate-200 pb-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
                  {detailLabel}
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-950">
                  {contentTitle}
                </h2>
              </div>
            </div>

            {bodyHtml ? (
              <div
                className="prose max-w-none break-words prose-headings:text-slate-950 prose-p:text-slate-650 prose-a:text-blue-700 prose-strong:text-slate-950 [&_img]:mx-auto [&_img]:h-auto [&_img]:w-full [&_img]:rounded-lg [&_img]:border [&_img]:border-slate-200 [&_img]:bg-slate-50"
                dangerouslySetInnerHTML={{ __html: bodyHtml }}
              />
            ) : (
              <p className="text-sm leading-6 text-slate-600">{emptyContent}</p>
            )}
          </article>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <section className="rounded-lg border border-slate-200 bg-[oklch(0.998_0.003_250)] p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-950">Thông tin nhanh</h2>
            <dl className="mt-5 space-y-4 text-sm">
              {validFacts.map((fact) => (
                <div key={fact.label} className="border-b border-slate-100 pb-4 last:border-b-0 last:pb-0">
                  <dt className="text-slate-500">{fact.label}</dt>
                  <dd className="mt-1 font-medium text-slate-900">{fact.value}</dd>
                </div>
              ))}
              {publishedAt ? (
                <div className="border-b border-slate-100 pb-4 last:border-b-0 last:pb-0">
                  <dt className="flex items-center gap-2 text-slate-500">
                    <CalendarDays className="h-4 w-4" />
                    Cập nhật
                  </dt>
                  <dd className="mt-1 font-medium text-slate-900">
                    {publishedAt.toLocaleDateString("vi-VN")}
                  </dd>
                </div>
              ) : null}
              {validFacts.length === 0 && !publishedAt ? (
                <p className="text-sm leading-6 text-slate-600">
                  AHSO sẽ cập nhật thêm thông tin phân loại cho nội dung này.
                </p>
              ) : null}
            </dl>
          </section>

          <section className="rounded-lg border border-slate-200 bg-[oklch(0.998_0.003_250)] p-5 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-950">
              <Clock3 className="h-4 w-4 text-blue-600" />
              Quy trình trao đổi
            </div>
            <ol className="mt-4 space-y-3">
              {PROCESS_COPY.map((item) => (
                <li key={item} className="flex gap-3 text-sm leading-6 text-slate-600">
                  <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-blue-600" />
                  <span>{item}</span>
                </li>
              ))}
            </ol>
          </section>

          <section className="rounded-lg border border-blue-200 bg-blue-50 p-5">
            <h2 className="text-lg font-semibold text-slate-950">{supportTitle}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {supportDescription}
            </p>
            <Link
              href="/contact"
              className="mt-5 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-blue-600 px-4 text-sm font-semibold text-white shadow transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-600"
            >
              {ctaLabel}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </section>
        </aside>
      </section>
    </main>
  );
}
