import type { Metadata } from "next";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { buildMetadata } from "@/lib/metadata";
import SolutionsSearchClient, {
  SolutionCard,
} from "./solutions-search-client";

export const revalidate = 60;

export const metadata: Metadata = buildMetadata({
  title: "Giải pháp công nghiệp & tự động hóa",
  description:
    "Tổng hợp giải pháp chuyển đổi số, MES, SCADA, IoT công nghiệp mà AHSO đã triển khai cho nhiều doanh nghiệp sản xuất.",
  path: "/solutions",
});

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function pickParam(
  params: Record<string, string | string[] | undefined>,
  key: string
) {
  const value = params[key];
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function toInt(value: string, def = 1) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : def;
}

export default async function SolutionsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const q = pickParam(params, "q").trim();
  const industry = pickParam(params, "industry").trim();
  const usecase = pickParam(params, "usecase").trim();
  const page = toInt(pickParam(params, "page"), 1);
  const pageSize = toInt(pickParam(params, "pageSize"), 12);

  const where: Prisma.SolutionWhereInput = { status: "PUBLISHED" };
  if (industry) where.industry = industry;
  if (usecase) where.usecase = usecase;
  if (q) {
    where.OR = [
      { title: { contains: q } },
      { summary: { contains: q } },
      { bodyHtml: { contains: q } },
      { usecase: { contains: q } },
    ];
  }

  const [total, rows] = await Promise.all([
    prisma.solution.count({ where }),
    prisma.solution.findMany({
      where,
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        slug: true,
        title: true,
        summary: true,
        coverImage: true,
        industry: true,
        usecase: true,
      },
    }),
  ]);

  const initialData: SolutionCard[] = rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    title: r.title,
    summary: r.summary ?? undefined,
    industry: r.industry ?? undefined,
    usecase: r.usecase ?? undefined,
    image: r.coverImage ?? null,
  }));

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      <section className="mb-8 rounded-3xl bg-linear-to-r from-blue-600 to-indigo-600 px-8 py-10 text-white shadow-lg">
        <p className="text-sm font-semibold uppercase tracking-wide text-white/80">
          Hệ sinh thái giải pháp AHSO
        </p>
        <h1 className="mt-2 text-3xl sm:text-4xl font-bold">
          Giải pháp tự động hóa & chuyển đổi số toàn diện
        </h1>
        <p className="mt-3 max-w-2xl text-white/80">
          Tìm kiếm và khám phá các giải pháp đã triển khai thực tế cho sản xuất:
          MES, SCADA, IoT công nghiệp, tối ưu vận hành và bảo trì.
        </p>
      </section>

      <SolutionsSearchClient
        initialData={initialData}
        initialTotal={total}
        initialQuery={{ q, industry, usecase, page, pageSize }}
      />
    </div>
  );
}
