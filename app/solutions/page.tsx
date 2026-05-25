import type { Metadata } from "next";

import { buildMetadata } from "@/lib/metadata";
import { prisma } from "@/lib/prisma";
import type { solutionWhereInput } from "@/lib/prisma-types";

import SolutionsSearchClient, {
  type SolutionCard,
  type SolutionCategoryOption,
} from "./solutions-search-client";

// Tránh prerender khi không có DB.
export const dynamic = "force-dynamic";

export const metadata: Metadata = buildMetadata({
  title: "Giải pháp công nghiệp & tự động hóa",
  description:
    "Tổng hợp giải pháp tự động hóa, robot, dây chuyền và phần mềm công nghiệp mà AHSO tư vấn, thiết kế và triển khai cho doanh nghiệp sản xuất.",
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

  const initialData: SolutionCard[] = rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    summary: row.summary ?? undefined,
    image: row.coverImage || "/logo.png",
    category: row.solutioncategory ?? null,
    isFeatured: row.isFeatured ?? false,
  }));

  const initialCategories: SolutionCategoryOption[] = categories.map((item) => ({
    id: item.id,
    slug: item.slug,
    name: item.name,
  }));

  return (
    <SolutionsSearchClient
      initialData={initialData}
      initialTotal={total}
      initialQuery={{ q, category, page, pageSize }}
      initialCategories={initialCategories}
    />
  );
}
