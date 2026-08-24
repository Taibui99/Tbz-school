import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { signOutIfSuspended } from "@/lib/auth/guards";

function safeNextPath(value: string | null): string {
  if (!value) return "/";
  if (!value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"));

  const oauthErrorUrl = new URL("/dang-nhap?error=oauth", request.url);

  if (!code) {
    return NextResponse.redirect(oauthErrorUrl);
  }

  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !user) {
    return NextResponse.redirect(oauthErrorUrl);
  }

  const loginUrl = new URL("/dang-nhap", request.url).toString();
  await signOutIfSuspended(supabase, user.id, loginUrl);

  return NextResponse.redirect(new URL(next, request.url));
}
