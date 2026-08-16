import Link from "next/link";
import { GraduationCap, LogIn } from "lucide-react";
import { NAV_LINKS } from "@/types";
import { signOutAction } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

export async function SiteHeader() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <GraduationCap className="size-5" aria-hidden="true" />
          <span>TBZ School</span>
        </Link>
        <nav
          aria-label="Điều hướng chính"
          className="flex items-center gap-1"
        >
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
          {user ? (
            <>
              <Link
                href="/tong-quan"
                className="rounded-md px-3 py-1.5 text-sm font-medium transition-colors hover:bg-muted hover:text-foreground"
              >
                Tổng quan
              </Link>
              <Link
                href="/kho"
                className="rounded-md px-3 py-1.5 text-sm font-medium transition-colors hover:bg-muted hover:text-foreground"
              >
                Kho của tôi
              </Link>
              <Link
                href="/thung-rac"
                className="rounded-md px-3 py-1.5 text-sm font-medium transition-colors hover:bg-muted hover:text-foreground"
              >
                Thùng rác
              </Link>
              <Link
                href="/ho-so"
                className="rounded-md px-3 py-1.5 text-sm font-medium transition-colors hover:bg-muted hover:text-foreground"
              >
                Hồ sơ
              </Link>
              <form action={signOutAction}>
                <Button type="submit" variant="outline" size="sm">
                  Đăng xuất
                </Button>
              </form>
            </>
          ) : (
            <Button
              variant="default"
              size="sm"
              render={<Link href="/dang-nhap" />}
            >
              <LogIn aria-hidden="true" />
              Đăng nhập
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}