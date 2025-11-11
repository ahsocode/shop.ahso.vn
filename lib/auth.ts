// lib/auth.ts
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { z } from "zod";

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
    return parsed.data;
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
    return parsed.data;
  } catch {
    throw new UnauthorizedError();
  }
}

/** RBAC: yêu cầu user.role thuộc 1 trong các role cho phép, sai thì NÉM lỗi 403 */
export function requireRole(user: JwtPayload, allowed: Array<"ADMIN" | "STAFF" | "USER">) {
  const role = user.role ?? "USER";
  if (!allowed.includes(role)) throw new ForbiddenError();
}