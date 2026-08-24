import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Chặn sớm các khu vực quản trị đối với visitor chưa có phiên Supabase.
 * Việc xác thực quyền admin vẫn do layout/page phía server kiểm tra.
 */
export function proxy(request: NextRequest) {
  const cookies = request.headers.get("cookie") ?? "";
  const hasSession = cookies
    .split(";")
    .some((c) => c.trim().startsWith("sb-") && c.includes("auth-token"));

  if (!hasSession) {
    const loginUrl = new URL("/dang-nhap", request.url);
    loginUrl.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/admin"],
};
