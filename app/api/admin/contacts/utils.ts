import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { contact_status, contact_priority } from "@prisma/client";

const dateField = z
  .preprocess((val) => {
    if (val === undefined) return undefined;
    if (val === null) return null;
    if (typeof val === "string") {
      const parsed = new Date(val);
      return Number.isNaN(parsed.getTime()) ? val : parsed;
    }
    return val;
  }, z.date())
  .nullable()
  .optional();

export const ContactUpdateSchema = z.object({
  status: z.nativeEnum(contact_status).optional(),
  priority: z.nativeEnum(contact_priority).optional(),
  assignedTo: z.string().trim().optional(),
  response: z.string().max(10_000).optional(),
  respondedAt: dateField,
  respondedBy: z.string().trim().optional(),
  internalNotes: z.string().max(10_000).optional(),
});

export type ContactUpdateInput = z.infer<typeof ContactUpdateSchema>;

export const contactSelect = {
  id: true,
  code: true,
  fullName: true,
  phone: true,
  email: true,
  company: true,
  subject: true,
  message: true,
  typeId: true,
  source: true,
  status: true,
  priority: true,
  assignedTo: true,
  response: true,
  respondedAt: true,
  respondedBy: true,
  ipAddress: true,
  userAgent: true,
  referrer: true,
  internalNotes: true,
  createdAt: true,
  updatedAt: true,
  contacttype: {
    select: {
      id: true,
      name: true,
      slug: true,
    },
  },
} as const satisfies Prisma.contactSelect;

export type ContactRow = Prisma.contactGetPayload<{ select: typeof contactSelect }>;

export const mapContactRow = (row: ContactRow) => {
  const { contacttype, ...rest } = row;
  return {
    ...rest,
    contactType: contacttype,
  };
};
