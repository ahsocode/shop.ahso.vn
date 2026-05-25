"use client";

import ShowcaseCatalogClient, {
  type ShowcaseCatalogItem,
  type ShowcaseCategoryOption,
} from "@/components/catalog/showcase-catalog-client";

export type SoftwareCard = ShowcaseCatalogItem;
export type SoftwareCategoryOption = ShowcaseCategoryOption;

type SoftwareSearchClientProps = {
  initialData?: SoftwareCard[];
  initialTotal?: number;
  initialQuery?: {
    q?: string;
    category?: string;
    page?: number;
    pageSize?: number;
  };
  initialCategories?: SoftwareCategoryOption[];
};

export default function SoftwareSearchClient(props: SoftwareSearchClientProps = {}) {
  return (
    <ShowcaseCatalogClient
      {...props}
      config={{
        basePath: "/software",
        apiPath: "/api/software",
        categoriesApiPath: "/api/software/categories",
        detailPath: "/software",
        eyebrow: "Phần mềm công nghiệp",
        title: "Phần mềm giúp vận hành rõ ràng hơn.",
        description:
          "Tổng hợp các phần mềm hỗ trợ kiểm tra, giám sát, báo cáo, kết nối dữ liệu và tối ưu quy trình trong môi trường sản xuất công nghiệp.",
        searchPlaceholder: "Tìm phần mềm theo tên, chức năng hoặc quy trình...",
        countLabel: "phần mềm",
        allCategoriesLabel: "Tất cả phần mềm",
        emptyTitle: "Chưa tìm thấy phần mềm phù hợp",
        emptyDescription:
          "Thử đổi từ khóa, bỏ bớt bộ lọc hoặc trao đổi với AHSO để xác định công cụ phù hợp với quy trình của bạn.",
        primaryCtaLabel: "Trao đổi về phần mềm",
        supportText:
          "Danh sách phần mềm tập trung vào mục đích sử dụng, phạm vi ứng dụng và giá trị triển khai để người xem ra quyết định nhanh hơn.",
        tone: "software",
      }}
    />
  );
}
