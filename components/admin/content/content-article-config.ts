export type ContentKind = "software" | "solution";
export type ContentStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

export type CategoryRow = {
  id: string;
  name: string;
};

export type ArticleRow = {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  status: ContentStatus;
  coverImage: string | null;
  categoryId: string;
  isFeatured?: boolean;
  publishedAt: string | null;
  updatedAt: string;
  industry?: string | null;
  usecase?: string | null;
  softwarecategory?: { id: string; name: string } | null;
  solutioncategory?: { id: string; name: string } | null;
};

export type ArticleDetail = ArticleRow & {
  bodyHtml: string;
  metaTitle: string | null;
  metaDescription: string | null;
  canonicalUrl: string | null;
};

export type ListResp<T> = {
  data: T[];
  meta: { total: number; page: number; pageSize: number };
};

export const statusLabels: Record<ContentStatus, string> = {
  DRAFT: "Bản nháp",
  PUBLISHED: "Đã xuất bản",
  ARCHIVED: "Đã lưu trữ",
};

export const configByKind = {
  software: {
    title: "Bài viết phần mềm",
    description: "Quản lý nội dung giới thiệu phần mềm, dịch vụ và năng lực triển khai.",
    createLabel: "Tạo bài viết phần mềm",
    editTitle: "Chỉnh sửa bài viết phần mềm",
    createTitle: "Tạo bài viết phần mềm",
    emptyText: "Chưa có bài viết phần mềm.",
    apiBase: "/api/admin/software",
    categoriesApi: "/api/admin/software-categories",
    featuredApi: "/api/admin/featured-softwares",
    featuredEntityIdKey: "softwareId",
    uploadCoverApi: "/api/admin/software/upload-cover",
    listHref: "/admin/software",
    createHref: "/admin/software/new",
    editHref: (id: string) => `/admin/software/${id}`,
    categoryField: "softwarecategory" as const,
    categoryLabel: "Danh mục phần mềm",
    searchPlaceholder: "Tìm theo tên hoặc mô tả...",
  },
  solution: {
    title: "Bài viết giải pháp",
    description: "Quản lý nội dung giới thiệu giải pháp, tình huống ứng dụng và năng lực tư vấn.",
    createLabel: "Tạo bài viết giải pháp",
    editTitle: "Chỉnh sửa bài viết giải pháp",
    createTitle: "Tạo bài viết giải pháp",
    emptyText: "Chưa có bài viết giải pháp.",
    apiBase: "/api/admin/solutions",
    categoriesApi: "/api/admin/solution-categories",
    featuredApi: "/api/admin/featured-solutions",
    featuredEntityIdKey: "solutionId",
    uploadCoverApi: "/api/admin/solutions/upload-cover",
    listHref: "/admin/solutions",
    createHref: "/admin/solutions/new",
    editHref: (id: string) => `/admin/solutions/${id}`,
    categoryField: "solutioncategory" as const,
    categoryLabel: "Danh mục giải pháp",
    searchPlaceholder: "Tìm theo tên, mô tả hoặc use case...",
  },
} as const;

export function getCategoryName(row: ArticleRow, kind: ContentKind) {
  const config = configByKind[kind];
  return row[config.categoryField]?.name ?? "Chưa phân loại";
}
