import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { quote_status, contact_priority } from "@prisma/client";

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

const dateField = z
  .preprocess((val) => {
    if (val === undefined) return undefined;
    if (val === null) return null;
    if (typeof val === "string") {
      const trimmed = val.trim();
      if (!trimmed) return undefined;
      const parsed = new Date(trimmed);
      return Number.isNaN(parsed.getTime()) ? trimmed : parsed;
    }
    return val;
  }, z.date())
  .nullable()
  .optional();

const codeSchema = z.string().regex(/^[A-Za-z0-9-]+$/).max(191);

export const QuoteRequestCreateSchema = z.object({
  code: z.preprocess((val) => (typeof val === "string" ? val.trim() : val), codeSchema).optional(),
  fullName: z.string().min(1),
  phone: z.string().min(8).max(32),
  email: z.string().email().nullable().optional(),
  company: z.string().max(191).nullable().optional(),
  taxCode: z.string().regex(/^\d{10}(\d{3})?$/).nullable().optional(),
  productId: z.string().nullable().optional(),
  productName: z.string().max(191).nullable().optional(),
  quantity: z.coerce.number().int().min(1).default(1),
  message: z.string().max(10_000).nullable().optional(),
  quotedPrice: decimalField,
  quotedTotal: decimalField,
  validUntil: dateField,
  paymentTerms: z.string().max(191).nullable().optional(),
  deliveryTerms: z.string().max(191).nullable().optional(),
  status: z.nativeEnum(quote_status).optional(),
  priority: z.nativeEnum(contact_priority).optional(),
  assignedTo: z.string().nullable().optional(),
  respondedBy: z.string().nullable().optional(),
  respondedAt: dateField,
  customerNotes: z.string().max(10_000).nullable().optional(),
  internalNotes: z.string().max(10_000).nullable().optional(),
  expiresAt: dateField,
});

export const QuoteRequestUpdateSchema = QuoteRequestCreateSchema.partial();

export type QuoteRequestCreateInput = z.infer<typeof QuoteRequestCreateSchema>;
export type QuoteRequestUpdateInput = z.infer<typeof QuoteRequestUpdateSchema>;

export const quoteRequestSelect = {
  id: true,
  code: true,
  fullName: true,
  phone: true,
  email: true,
  company: true,
  taxCode: true,
  productId: true,
  productName: true,
  quantity: true,
  message: true,
  quotedPrice: true,
  quotedTotal: true,
  validUntil: true,
  paymentTerms: true,
  deliveryTerms: true,
  status: true,
  priority: true,
  assignedTo: true,
  respondedBy: true,
  respondedAt: true,
  customerNotes: true,
  internalNotes: true,
  createdAt: true,
  updatedAt: true,
  expiresAt: true,
  product: {
    select: {
      id: true,
      name: true,
      slug: true,
      sku: true,
      price: true,
      currency: true,
      coverImage: true,
    },
  },
} as const satisfies Prisma.quoterequestSelect;

export type QuoteRequestRow = Prisma.quoterequestGetPayload<{
  select: typeof quoteRequestSelect;
}>;

type QuoteRequestProduct = {
  id: string;
  name: string;
  slug: string;
  sku: string | null;
  price: Prisma.Decimal | number;
  currency: string;
  coverImage: string | null;
};
export const mapQuoteRequestRow = (row: QuoteRequestRow) => {
  const { product, quotedPrice, quotedTotal, ...rest } = row;

  const p = product as QuoteRequestProduct | null; // 👈 ép kiểu rõ ràng

  return {
    ...rest,
    quotedPrice: quotedPrice !== null ? Number(quotedPrice) : null,
    quotedTotal: quotedTotal !== null ? Number(quotedTotal) : null,
    product: p
      ? {
          id: p.id,
          name: p.name,
          slug: p.slug,
          sku: p.sku,
          currency: p.currency,
          coverImage: p.coverImage,
          price: Number(p.price),
        }
      : null,
  };
};