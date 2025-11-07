import { z } from "zod";

export const SearchSoftwareDTO = z.object({
  q: z.string().min(1, "Vui lòng nhập từ khóa"),
  service: z.enum(["implementation", "integration", "maintenance", "training"]).optional(),
  stack: z.string().optional(), // ví dụ: "MES,ERP,CMMS,SCADA"
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
});

export type SearchSoftwareDTOType = z.infer<typeof SearchSoftwareDTO>;
