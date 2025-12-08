import { prisma } from "@/lib/prisma";

export const POLICY_SECTIONS = [
  { slug: "return", title: "Chính sách đổi trả" },
  { slug: "warranty", title: "Chính sách bảo hành" },
  { slug: "payment-security", title: "Chính sách bảo mật thanh toán" },
  { slug: "shipping", title: "Chính sách vận chuyển & nhận hàng" },
  { slug: "cancellation", title: "Chính sách hủy đơn & thay đổi thông tin" },
] as const;

export type PolicySlug = (typeof POLICY_SECTIONS)[number]["slug"];

export async function ensurePolicySections() {
  await Promise.all(
    POLICY_SECTIONS.map((section) =>
      prisma.policysection.upsert({
        where: { slug: section.slug },
        update: {},
        create: {
          slug: section.slug,
          title: section.title,
        },
      }),
    ),
  );
}

export async function getPolicySections() {
  await ensurePolicySections();
  return prisma.policysection.findMany({
    orderBy: { createdAt: "asc" },
  });
}

export async function updatePolicySection(
  slug: PolicySlug,
  data: { description?: string | null; allowedText?: string | null; deniedText?: string | null; content?: string | null },
) {
  await ensurePolicySections();
  return prisma.policysection.update({
    where: { slug },
    data: {
      description: data.description ?? null,
      allowedText: data.allowedText ?? null,
      deniedText: data.deniedText ?? null,
      content: data.content ?? null,
    },
  });
}
