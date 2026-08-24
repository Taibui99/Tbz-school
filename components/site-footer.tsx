import Link from "next/link";
import { GraduationCap } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="relative mt-16">
      <div className="mx-auto w-full max-w-6xl px-4 pb-10">
        <div className="glass-panel flex flex-col items-center justify-between gap-6 rounded-3xl px-8 py-8 text-center sm:flex-row sm:text-left">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-center gap-2.5 sm:justify-start">
              <span className="bg-brand-gradient flex size-8 items-center justify-center rounded-xl text-white">
                <GraduationCap className="size-4" aria-hidden="true" />
              </span>
              <span className="font-heading text-lg font-bold tracking-tight">
                Tbz <span className="text-gradient">Cloud</span>
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              Học tập có tổ chức — tài liệu luôn trong tầm tay.
            </p>
          </div>
          <nav
            aria-label="Liên kết chân trang"
            className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-muted-foreground"
          >
            <Link
              href="/kham-pha"
              className="transition-colors hover:text-foreground"
            >
              Khám phá
            </Link>
            <Link
              href="/tim-kiem"
              className="transition-colors hover:text-foreground"
            >
              Tìm kiếm
            </Link>
            <Link
              href="/dieu-khoan"
              className="transition-colors hover:text-foreground"
            >
              Điều khoản
            </Link>
            <Link
              href="/quyen-rieng-tu"
              className="transition-colors hover:text-foreground"
            >
              Quyền riêng tư
            </Link>
            <Link
              href="/dang-ky"
              className="font-medium text-primary transition-colors hover:opacity-80"
            >
              Tạo tài khoản miễn phí
            </Link>
          </nav>
          <p className="text-xs text-muted-foreground/70">
            © {new Date().getFullYear()} Tbz cloud
            <span className="mx-1.5" aria-hidden="true">
              ·
            </span>
            Workspace → Collection → Lesson → Resource
          </p>
        </div>
      </div>
    </footer>
  );
}
