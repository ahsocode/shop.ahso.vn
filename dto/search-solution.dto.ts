import { z } from "zod";

export const SearchSolutionsDTO = z.object({
  q: z.string().min(1, "Vui lòng nhập từ khóa"),
  industry: z.enum(["food", "auto", "electronics", "other"]).optional(),
  usecase: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
});

export type SearchSolutionsDTOType = z.infer<typeof SearchSolutionsDTO>;
