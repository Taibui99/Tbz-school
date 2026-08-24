import { type EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { signOutIfSuspended } from "@/lib/auth/guards";

function safeNextPath(value: string | null): string {
  if (!value) return "/ho-so";
  if (!value.startsWith("/") || value.startsWith("//")) return "/ho-so";
  return value;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"));

  const invalidLinkUrl = new URL(
    "/dang-nhap?error=invalid-link",
    request.url,
  );

  if (!code && !(tokenHash && type)) {
    return NextResponse.redirect(invalidLinkUrl);
  }

  const supabase = await createClient();
  const result = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : await supabase.auth.verifyOtp({
        type: type as EmailOtpType,
        token_hash: tokenHash as string,
      });

  if (result.error || !result.data.user) {
    return NextResponse.redirect(invalidLinkUrl);
  }

  const loginUrl = new URL("/dang-nhap", request.url).toString();
  await signOutIfSuspended(supabase, result.data.user.id, loginUrl);

  return NextResponse.redirect(new URL(next, request.url));
}