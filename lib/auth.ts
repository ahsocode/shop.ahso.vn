// lib/auth.ts
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { z } from "zod";
import type { Prisma, Role } from "@prisma/client";
import { prisma, prismaSupportsUserBlockField } from "./prisma";

/** Payload JWT (ký bằng jose trong login) */
export const JwtPayloadSchema = z.object({
  sub: z.string(),                                  // user id
  username: z.string().optional(),
  email: z.string().email().optional(),
  role: z.enum(["USER", "STAFF", "ADMIN"]).optional(),
  iat: z.number().optional(),
  exp: z.number().optional(),
});
export type JwtPayload = z.infer<typeof JwtPayloadSchema>;

/** Lấy token từ Authorization: Bearer ... hoặc cookie "auth_token" */
export function getTokenFromRequest(req: NextRequest): string | null {
  // 1. Ưu tiên Authorization header
  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) {
    return auth.slice(7);
  }

  // 2. Fallback cookie "auth_token"
  const cookieToken = req.cookies.get("auth_token")?.value;
  if (cookieToken) {
    return cookieToken;
  }

  return null;
}

/** Kiểu lỗi HTTP đơn giản để route có thể bắt và trả về status phù hợp */
export class HttpError extends Error {
  status: number;
  constructor(status: number, message?: string) {
    super(message);
    this.status = status;
  }
}

export class UnauthorizedError extends HttpError {
  constructor(message = "Unauthorized") {
    super(401, message);
  }
}

export class ForbiddenError extends HttpError {
  constructor(message = "Forbidden") {
    super(403, message);
  }
}

/** Xác thực: trả về payload hoặc null (không ném lỗi) */
export async function verifyRequestUser(req: NextRequest): Promise<JwtPayload | null> {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("Missing JWT_SECRET");
  
  const token = getTokenFromRequest(req);
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
    const parsed = JwtPayloadSchema.safeParse(payload);
    if (!parsed.success) return null;
    const userRecord = await fetchUserRecord(parsed.data.sub);
    if (!userRecord) return null;
    if (userRecord.isBlocked) return null;
    return { ...parsed.data, role: userRecord.role };
  } catch {
    return null;
  }
}

/** Xác thực: yêu cầu có Bearer token hoặc cookie hợp lệ, sai thì NÉM lỗi 401 */
export async function verifyBearerAuth(req: NextRequest): Promise<JwtPayload> {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("Missing JWT_SECRET");

  const token = getTokenFromRequest(req);
  if (!token) throw new UnauthorizedError();

  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
    const parsed = JwtPayloadSchema.safeParse(payload);
    if (!parsed.success) throw new UnauthorizedError();
    const userRecord = await fetchUserRecord(parsed.data.sub);
    if (!userRecord) throw new UnauthorizedError();
    if (userRecord.isBlocked) throw new ForbiddenError("ACCOUNT_BLOCKED");
    return { ...parsed.data, role: userRecord.role };
  } catch (error) {
    if (error instanceof ForbiddenError) throw error;
    throw new UnauthorizedError();
  }
}

/** RBAC: yêu cầu user.role thuộc 1 trong các role cho phép, sai thì NÉM lỗi 403 */
export function requireRole(user: JwtPayload, allowed: Array<"ADMIN" | "STAFF" | "USER">) {
  const role = user.role ?? "USER";
  if (!allowed.includes(role)) throw new ForbiddenError();
}

type ActiveUserRecord = { id: string; role: Role; isBlocked: boolean };

async function fetchUserRecord(userId: string): Promise<ActiveUserRecord | null> {
  if (!userId) return null;
  const BASE_SELECT = { id: true, role: true } satisfies Prisma.UserSelect;
  const select: Prisma.UserSelect = prismaSupportsUserBlockField
    ? { ...BASE_SELECT, isBlocked: true }
    : BASE_SELECT;
  const record = await prisma.user.findUnique({
    where: { id: userId },
    select,
  });
  if (!record) return null;
  return {
    id: record.id,
    role: record.role as Role,
    isBlocked: prismaSupportsUserBlockField ? Boolean(record.isBlocked) : false,
  };
}
