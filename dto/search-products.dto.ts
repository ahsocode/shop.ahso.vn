import { z } from "zod";

export const SearchProductsDTO = z.object({
  q: z.string().min(1, "Vui lòng nhập từ khóa"),
  brand: z.string().optional(),
  category: z.string().optional(),
  minPrice: z.coerce.number().nonnegative().optional(),
  maxPrice: z.coerce.number().nonnegative().optional(),
  inStock: z.coerce.boolean().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
}).refine(
  (d) => !(d.minPrice && d.maxPrice) || d.minPrice <= d.maxPrice,
  { message: "minPrice không được lớn hơn maxPrice", path: ["minPrice"] }
);

export type SearchProductsDTOType = z.infer<typeof SearchProductsDTO>;
