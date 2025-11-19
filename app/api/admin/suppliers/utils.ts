import { z } from "zod";
import type { Prisma } from "@/generated/client";

const decimalField = z
  .preprocess((val) => {
    if (val === undefined) return undefined;
    if (val === null) return null;
    if (typeof val === "string") {
      const trimmed = val.trim();
      if (!trimmed) return undefined;
      const parsed = Number(trimmed);
      return Number.isFinite(parsed) ? parsed : trimmed;
    }
    return val;
  }, z.number().nonnegative())
  .nullable()
  .optional();

const codeField = z
  .preprocess((val) => {
    if (val === null) return null;
    if (typeof val === "string") return val.trim();
    return val;
  }, z.string().regex(/^[A-Za-z0-9-_.]+$/, "Chỉ cho phép chữ cái, số và -_."))
  .nullable()
  .optional();

export const SupplierCreateSchema = z.object({
  name: z.string().min(1),
  slug: z.string().trim().min(1).optional(),
  code: codeField,
  contactPerson: z.string().trim().max(191).optional(),
  email: z.string().email().optional(),
  phone: z.string().trim().max(32).optional(),
  address: z.string().max(10_000).optional(),
  taxCode: z.string().regex(/^\d{10}(\d{3})?$/).optional(),
  paymentTerms: z.string().trim().max(191).optional(),
  minOrderValue: decimalField,
  shippingFee: decimalField,
  rating: z.coerce.number().min(0).max(5).optional(),
  notes: z.string().max(10_000).optional(),
  isActive: z.boolean().optional(),
});

export const SupplierUpdateSchema = SupplierCreateSchema.partial();

export type SupplierCreateInput = z.infer<typeof SupplierCreateSchema>;
export type SupplierUpdateInput = z.infer<typeof SupplierUpdateSchema>;

export const supplierSelect = {
  id: true,
  name: true,
  slug: true,
  code: true,
  contactPerson: true,
  email: true,
  phone: true,
  address: true,
  taxCode: true,
  paymentTerms: true,
  minOrderValue: true,
  shippingFee: true,
  rating: true,
  totalOrders: true,
  notes: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { product: true } },
} as const satisfies Prisma.supplierSelect;

export type SupplierRow = Prisma.supplierGetPayload<{ select: typeof supplierSelect }>;

export const mapSupplierRow = (row: SupplierRow) => {
  const { _count, ...rest } = row;
  return {
    ...rest,
    productCount: _count.product,
  };
};

export const buildSupplierData = (input: SupplierCreateInput & { slug: string; code: string | null }) => ({
  name: input.name,
  slug: input.slug,
  code: input.code ?? null,
  contactPerson: input.contactPerson ?? null,
  email: input.email ?? null,
  phone: input.phone ?? null,
  address: input.address ?? null,
  taxCode: input.taxCode ?? null,
  paymentTerms: input.paymentTerms ?? null,
  minOrderValue: input.minOrderValue ?? null,
  shippingFee: input.shippingFee ?? null,
  rating: input.rating ?? undefined,
  notes: input.notes ?? null,
  isActive: input.isActive ?? true,
});
