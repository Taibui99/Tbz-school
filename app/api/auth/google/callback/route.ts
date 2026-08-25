import { NextResponse } from "next/server";
import {
  exchangeCodeForTokens,
  isGoogleConfigured,
} from "@/lib/youtube/client";
import { isAdminUser } from "@/lib/youtube/store";
import { setGoogleConnection } from "@/lib/youtube/store";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const fail = (reason: string) =>
    NextResponse.redirect(
      new URL(`/ho-so?google=error&reason=${reason}`, url.origin),
    );

  if (!isGoogleConfigured()) return fail("not-configured");

  const code = url.searchParams.get("code");
  if (!code) return fail("no-code");

  // Validate OAuth state (CSRF protection)
  const state = url.searchParams.get("state");
  const cookieState = request.headers.get("cookie")?.match(/google_oauth_state=([^;]+)/)?.[1];
  if (!state || !cookieState || state !== cookieState) {
    return fail("invalid-state");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail("auth");
  if (!isAdminUser(user)) return fail("forbidden");

  const redirectUri = `${url.origin}/api/auth/google/callback`;

  try {
    const tokens = await exchangeCodeForTokens(code, redirectUri);
    const result = await setGoogleConnection(
      tokens.email ?? null,
      tokens.refresh_token,
    );
    if (!result.ok) return fail("store");
    const response = NextResponse.redirect(
      new URL("/ho-so?google=connected", url.origin),
    );
    response.cookies.delete("google_oauth_state");
    return response;
  } catch {
    return fail("exchange");
  }
}