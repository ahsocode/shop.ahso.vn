import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { buildMetadata } from "@/lib/metadata";
import SolutionsSearchClient, {
  SolutionCard,
  SolutionCategoryOption,
} from "./solutions-search-client";
import type { solutionWhereInput } from "@/lib/prisma-types";

// Tránh prerender khi không có DB
export const dynamic = "force-dynamic";

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

function SolutionsFallback() {
  return (
    <div className="min-h-screen bg-linear-to-br from-gray-50 to-blue-50/30">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="rounded-2xl border border-gray-200 bg-white p-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Giải pháp tự động hóa & chuyển đổi số
          </h1>
          <p className="mt-2 text-gray-600">
            Dữ liệu sẽ được tải ở môi trường chạy thật. (CI skip DB khi build.)
          </p>
        </div>
      </div>
    </div>
  );
}

export default async function SolutionsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const SKIP_BUILD_DB = process.env.SKIP_BUILD_DB === "true";
  if (SKIP_BUILD_DB) return <SolutionsFallback />;

  const params = await searchParams;
  const q = pickParam(params, "q").trim();
  const category = pickParam(params, "category").trim();
  const page = toInt(pickParam(params, "page"), 1);
  const pageSize = toInt(pickParam(params, "pageSize"), 20);

  const where: solutionWhereInput = { status: "PUBLISHED" };
  if (category) where.solutioncategory = { is: { slug: category } };
  if (q) {
    where.OR = [
      { title: { contains: q } },
      { summary: { contains: q } },
      { bodyHtml: { contains: q } },
    ];
  }

  const result = await Promise.all([
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
        isFeatured: true,
        solutioncategory: { select: { id: true, slug: true, name: true } },
      },
    }),
    prisma.solutioncategory.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, slug: true, name: true },
    }),
  ]).catch((err) => {
    console.error("[solutions] DB error, fallback UI:", err);
    return null;
  });

  if (!result) return <SolutionsFallback />;
  const [total, rows, categories] = result;

  const initialData: SolutionCard[] = rows.map((r: (typeof rows)[number]): SolutionCard => ({
    id: r.id,
    slug: r.slug,
    title: r.title,
    summary: r.summary ?? undefined,
    image: r.coverImage || "/logo.png",
    category: r.solutioncategory ?? null,
    isFeatured: r.isFeatured ?? false,
  }));

  const initialCategories: SolutionCategoryOption[] = categories.map(
    (c: (typeof categories)[number]): SolutionCategoryOption => ({
      id: c.id,
      slug: c.slug,
      name: c.name,
    })
  );

  return (
    <SolutionsSearchClient
      initialData={initialData}
      initialTotal={total}
      initialQuery={{ q, category, page, pageSize }}
      initialCategories={initialCategories}
    />
  );
}
