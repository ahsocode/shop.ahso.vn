import { jwtVerify } from "jose";

function getTokenFromReq(req: Request): string | null {
  const auth = req.headers.get("authorization") || "";
  const bearer = auth.match(/^Bearer\s+(.+)$/i);
  if (bearer) return bearer[1];

  const cookieHeader = req.headers.get("cookie") || "";
  const cookieMatch = cookieHeader.match(/(?:^|;\s*)auth_token=([^;]+)/);
  return cookieMatch ? decodeURIComponent(cookieMatch[1]) : null;
}

export async function getUserIdFromReq(req: Request) {
  const token = getTokenFromReq(req);
  if (!token) return null;

  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("Missing JWT_SECRET");

  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
    return (payload.sub as string) ?? null;
  } catch {
    return null;
  }
}
