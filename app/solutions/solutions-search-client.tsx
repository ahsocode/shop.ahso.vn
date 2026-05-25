"use client";

import ShowcaseCatalogClient, {
  type ShowcaseCatalogItem,
  type ShowcaseCategoryOption,
} from "@/components/catalog/showcase-catalog-client";

export type SolutionCard = ShowcaseCatalogItem;
export type SolutionCategoryOption = ShowcaseCategoryOption;

type SolutionsSearchClientProps = {
  initialData?: SolutionCard[];
  initialTotal?: number;
  initialQuery?: {
    q?: string;
    category?: string;
    page?: number;
    pageSize?: number;
  };
  initialCategories?: SolutionCategoryOption[];
};

export default function SolutionsSearchClient(props: SolutionsSearchClientProps = {}) {
  return (
    <ShowcaseCatalogClient
      {...props}
      config={{
        basePath: "/solutions",
        apiPath: "/api/search/solutions",
        categoriesApiPath: "/api/solutions/categories",
        detailPath: "/solutions",
        eyebrow: "Giải pháp công nghiệp",
        title: "Giải pháp rõ bài toán, chắc phương án.",
        description:
          "Khám phá các giải pháp tự động hóa, dây chuyền, robot và cải tiến vận hành mà AHSO có thể tư vấn, thiết kế và triển khai theo nhu cầu thực tế.",
        searchPlaceholder: "Tìm giải pháp theo tên, ngành hoặc bài toán...",
        countLabel: "giải pháp",
        allCategoriesLabel: "Tất cả giải pháp",
        emptyTitle: "Chưa tìm thấy giải pháp phù hợp",
        emptyDescription:
          "Thử đổi từ khóa, bỏ bớt bộ lọc hoặc liên hệ AHSO để được tư vấn theo bài toán cụ thể.",
        primaryCtaLabel: "Yêu cầu tư vấn giải pháp",
        supportText:
          "Mỗi giải pháp được trình bày ngắn gọn để người xem hiểu mục tiêu, phạm vi ứng dụng và bước trao đổi tiếp theo.",
        tone: "solutions",
      }}
    />
  );
}
