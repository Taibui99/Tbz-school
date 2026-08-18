import { NextResponse } from "next/server";
import {
  exchangeCodeForTokens,
  isGoogleConfigured,
} from "@/lib/youtube/client";
import { setGoogleConnection } from "@/lib/youtube/store";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const fail = (reason: string) =>
    NextResponse.redirect(new URL(`/ho-so?google=error&reason=${reason}`, url.origin));

  if (!isGoogleConfigured()) return fail("not-configured");

  const code = url.searchParams.get("code");
  if (!code) return fail("no-code");

  const redirectUri = `${url.origin}/api/auth/google/callback`;

  try {
    const tokens = await exchangeCodeForTokens(code, redirectUri);
    const result = await setGoogleConnection(
      tokens.email ?? null,
      tokens.refresh_token,
    );
    if (!result.ok) return fail("store");
    return NextResponse.redirect(
      new URL("/ho-so?google=connected", url.origin),
    );
  } catch {
    return fail("exchange");
  }
}