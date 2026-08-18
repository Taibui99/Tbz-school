import { NextResponse } from "next/server";
import {
  buildConsentUrl,
  createOAuthState,
  isGoogleConfigured,
} from "@/lib/youtube/client";

export const dynamic = "force-dynamic";

export function GET(request: Request) {
  if (!isGoogleConfigured()) {
    return NextResponse.redirect(
      new URL("/ho-so?google=not-configured", request.url),
    );
  }
  const url = new URL(request.url);
  const redirectUri = `${url.origin}/api/auth/google/callback`;
  const state = createOAuthState();
  return NextResponse.redirect(buildConsentUrl(redirectUri, state));
}
