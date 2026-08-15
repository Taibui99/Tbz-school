import { GraduationCap } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-muted/40">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-8 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-sm font-medium">
          <GraduationCap className="size-4" aria-hidden="true" />
          <span>TBZ School</span>
        </div>
        <p className="text-sm text-muted-foreground">
          Workspace → Collection → Lesson → Resource
        </p>
        <p className="text-sm text-muted-foreground">
          Nền tảng đang trong giai đoạn xây dựng
        </p>
      </div>
    </footer>
  );
}
