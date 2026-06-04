import { prisma } from "@/lib/prisma";

export type PolicyInput = {
  name: string;
  content: string;
};

export function normalizePolicyInput(input: PolicyInput): PolicyInput {
  return {
    name: input.name.trim(),
    content: input.content.trim(),
  };
}

export async function getPolicySections() {
  return prisma.policysection.findMany({
    orderBy: { name: "asc" },
  });
}

export async function createPolicySection(input: PolicyInput) {
  const data = normalizePolicyInput(input);
  return prisma.policysection.create({ data });
}

export async function updatePolicySection(id: string, input: PolicyInput) {
  const data = normalizePolicyInput(input);
  return prisma.policysection.update({
    where: { id },
    data,
  });
}

export async function deletePolicySection(id: string) {
  return prisma.policysection.delete({
    where: { id },
  });
}
