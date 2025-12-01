import { NextResponse } from "next/server";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";

function getBaseUrl(req: Request) {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL;
  if (envUrl) return envUrl.replace(/\/$/, "");
  const url = new URL(req.url);
  return `${url.protocol}//${url.host}`;
}

export async function GET(req: Request) {
  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const redirect = new URL(req.url).searchParams.get("redirect") || "/";

    if (!clientId) {
      return NextResponse.json(
        { error: "SERVER_MISCONFIGURED", message: "Missing GOOGLE_CLIENT_ID" },
        { status: 500 },
      );
    }

    const redirectUri = `${getBaseUrl(req)}/api/auth/callback/google`;
    const state = Buffer.from(
      JSON.stringify({
        redirect,
      }),
    ).toString("base64url");

    const authUrl = new URL(GOOGLE_AUTH_URL);
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("scope", "openid email profile");
    authUrl.searchParams.set("prompt", "select_account");
    authUrl.searchParams.set("access_type", "offline");
    authUrl.searchParams.set("state", state);

    return NextResponse.redirect(authUrl.toString());
  } catch (error) {
    console.error("Google OAuth init error:", error);
    return NextResponse.json({ error: "OAUTH_INIT_FAILED" }, { status: 500 });
  }
}
