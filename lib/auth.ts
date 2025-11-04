import { jwtVerify } from "jose";

export type JwtPayload = {
  sub: string;
  username: string;
  email: string;
  role: "USER" | "STAFF" | "ADMIN";
  iat: number;
  exp: number;
};

export async function verifyBearerAuth(req: Request) {
  const auth = req.headers.get("authorization") || "";
  const m = auth.match(/^Bearer\s+(.+)$/i);
  if (!m) return null;

  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("Missing JWT_SECRET");

  try {
    const { payload } = await jwtVerify(m[1], new TextEncoder().encode(secret));
    return payload as JwtPayload;
  } catch {
    return null;
  }
}

export function requireRole(payload: JwtPayload | null, roles: Array<JwtPayload["role"]>) {
  return !!payload && roles.includes(payload.role);
}