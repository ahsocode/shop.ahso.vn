// lib/prisma.ts
import { PrismaClient, Prisma } from "@/generated/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

type PrismaNamespace = { UserScalarFieldEnum?: Record<string, string> };
const prismaNamespace = Prisma as unknown as PrismaNamespace;
export const prismaSupportsUserBlockField = Boolean(prismaNamespace.UserScalarFieldEnum?.isBlocked);
