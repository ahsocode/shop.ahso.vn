import { z } from "zod";

export const BrandCreateSchema = z.object({
  name: z.string().min(1),
  slug: z.string().trim().optional(),
  logoUrl: z.string().url().optional(),
  summary: z.string().optional().nullable(),
});
export const BrandUpdateSchema = BrandCreateSchema.partial();

export const CategoryCreateSchema = z.object({
  name: z.string().min(1),
  slug: z.string().trim().optional(),
  coverImage: z.string().url().optional(),
  description: z.string().optional().nullable(),
});
export const CategoryUpdateSchema = CategoryCreateSchema.partial();

export const ProductTypeCreateSchema = z.object({
  name: z.string().min(1),
  slug: z.string().trim().optional(),
  categoryId: z.string().min(1),
  coverImage: z.string().url().optional(),
  description: z.string().optional().nullable(),
});
export const ProductTypeUpdateSchema = ProductTypeCreateSchema.partial();

export const PublishStatusEnum = z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional();

export const ProductCreateSchema = z.object({
  name: z.string().min(1),
  sku: z.string().min(1),
  typeId: z.string().min(1),
  price: z.number().finite().nonnegative(),
  slug: z.string().trim().optional(),
  description: z.string().optional().nullable(),
  coverImage: z.string().url().optional(),
  brandId: z.string().optional(),
  listPrice: z.number().finite().nonnegative().optional(),
  stockOnHand: z.number().int().nonnegative().optional(),
  status: PublishStatusEnum,
});
export const ProductUpdateSchema = ProductCreateSchema.partial();

export const SpecDefCreateSchema = z.object({
  name: z.string().min(1),
  slug: z.string().optional(),
});
export const SpecDefUpdateSchema = SpecDefCreateSchema.partial();

export const ProductSpecCreateSchema = z.object({
  specDefinitionId: z.string().min(1),
  valueString: z.string().optional(),
  valueNumber: z.number().optional(),
  valueBoolean: z.boolean().optional(),
  unitOverride: z.string().optional(),
  note: z.string().optional(),
  sortOrder: z.number().int().optional(),
});
export const ProductSpecUpdateSchema = ProductSpecCreateSchema.partial();

export const ProductImageCreateSchema = z.object({
  url: z.string().url(),
  alt: z.string().optional(),
  sortOrder: z.number().int().optional(),
});
export const ProductImageUpdateSchema = z.object({
  alt: z.string().optional(),
  sortOrder: z.number().int().optional(),
});
