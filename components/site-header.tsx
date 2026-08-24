import Link from "next/link";
import { GraduationCap, LogIn } from "lucide-react";
import { NAV_LINKS } from "@/types";
import { signOutAction } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

const navLinkClass =
  "rounded-full px-3 py-1.5 text-sm font-medium text-muted-foreground transition-all hover:bg-accent hover:text-foreground";

export async function SiteHeader() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="sticky top-0 z-50 px-3 pt-3 sm:px-4">
      <div className="glass-panel mx-auto flex min-h-14 w-full max-w-6xl items-center justify-between gap-2 rounded-full px-4 py-2">
        <Link
          href="/"
          className="group flex items-center gap-2.5 rounded-full pr-2"
        >
          <span className="bg-brand-gradient flex size-9 items-center justify-center rounded-2xl text-white shadow-[var(--glow-brand)] transition-transform group-hover:scale-105 group-active:scale-95">
            <GraduationCap className="size-5" aria-hidden="true" />
          </span>
          <span className="font-heading text-lg leading-none font-bold tracking-tight">
            Tbz{" "}
            <span className="text-gradient">Cloud</span>
          </span>
        </Link>
        <nav
          aria-label="Điều hướng chính"
          className="flex flex-wrap items-center justify-end gap-0.5"
        >
          {user ? (
            <>
              <Link href="/tong-quan" className={navLinkClass}>
                Tổng quan
              </Link>
              <Link href="/kho" className={navLinkClass}>
                Kho của tôi
              </Link>
              <Link href="/thung-rac" className={navLinkClass}>
                Thùng rác
              </Link>
              <Link href="/ho-so" className={navLinkClass}>
                Hồ sơ
              </Link>
              <form action={signOutAction} className="ml-1.5">
                <Button type="submit" variant="outline" size="sm" className="h-8 rounded-full px-3.5">
                  Đăng xuất
                </Button>
              </form>
            </>
          ) : (
            <>
              {NAV_LINKS.map((link) => (
                <Link key={link.href} href={link.href} className={navLinkClass}>
                  {link.label}
                </Link>
              ))}
              <Button
                variant="default"
                size="sm"
                className="ml-1.5 h-8 rounded-full px-4"
                render={<Link href="/dang-nhap" />}
              >
                <LogIn aria-hidden="true" />
                Đăng nhập
              </Button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
