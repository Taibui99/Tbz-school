import { NextResponse } from "next/server";
import {
  buildConsentUrl,
  createOAuthState,
  isGoogleConfigured,
} from "@/lib/youtube/client";
import { isAdminUser } from "@/lib/youtube/store";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);

  if (!isGoogleConfigured()) {
    return NextResponse.redirect(
      new URL("/ho-so?google=not-configured", url.origin),
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    const login = new URL("/dang-nhap", url.origin);
    login.searchParams.set("redirect", "/ho-so");
    return NextResponse.redirect(login);
  }
  if (!isAdminUser(user)) {
    return NextResponse.redirect(
      new URL("/ho-so?google=forbidden", url.origin),
    );
  }

  const redirectUri = `${url.origin}/api/auth/google/callback`;
  const state = createOAuthState();
  const response = NextResponse.redirect(buildConsentUrl(redirectUri, state));
  response.cookies.set("google_oauth_state", state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 600, // 10 phút
  });
  return response;
}