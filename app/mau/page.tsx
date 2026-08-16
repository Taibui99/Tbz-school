import { Star, Search, FolderOpen, BookOpen, FileText, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TypeIcon } from "@/components/resource/type-icon";

const THEMES = [
  { id: "tbz-blue", name: "Xanh dương + Cam", note: "Khan Academy / Google Classroom" },
  { id: "tbz-purple", name: "Tím + Hồng", note: "Hiện đại, sáng tạo" },
  { id: "tbz-green", name: "Xanh lá + Vàng", note: "Tự nhiên, thân thiện" },
] as const;

const WORKSPACES = [
  { name: "Kho Toán 11", desc: "12 bài · 34 tài liệu", icon: BookOpen },
  { name: "Kho Văn 12", desc: "8 bài · 21 tài liệu", icon: FileText },
  { name: "Kho Hóa 10", desc: "15 bài · 40 tài liệu", icon: FolderOpen },
];

const RESOURCES: { title: string; type: string; tag: string; color: string }[] = [
  { title: "Đề cương hàm số", type: "pdf", tag: "toán", color: "text-red-600" },
  { title: "Bài giảng đạo hàm", type: "pptx", tag: "toán", color: "text-orange-600" },
  { title: "Bảng tuần hoàn", type: "xlsx", tag: "hóa", color: "text-emerald-600" },
  { title: "Thí nghiệm điện phân", type: "video", tag: "hóa", color: "text-violet-600" },
  { title: "Đoạn văn mẫu nghị luận", type: "doc", tag: "văn", color: "text-sky-600" },
];

function ThemePreview({ theme }: { theme: (typeof THEMES)[number] }) {
  return (
    <div
      className={`${theme.id} overflow-hidden rounded-2xl border border-border bg-background shadow-sm`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-muted/60 px-5 py-3">
        <div className="flex items-center gap-2">
          <div className="flex size-6 items-center justify-center rounded-md bg-primary text-[13px] font-bold text-primary-foreground">
            T
          </div>
          <span className="text-sm font-semibold">TBZ School</span>
        </div>
        <div className="flex items-center gap-1 rounded-full bg-background px-3 py-1 text-xs text-muted-foreground">
          <Search className="size-3" aria-hidden="true" />
          Tìm kiếm tài liệu…
        </div>
      </div>

      <div className="p-5">
        <div className="flex items-baseline justify-between">
          <h3 className="text-lg font-semibold tracking-tight">
            Kho của tôi
          </h3>
          <span className="text-xs text-muted-foreground">3 kho · 95 tài liệu</span>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {WORKSPACES.map((ws) => (
            <div
              key={ws.name}
              className="flex items-center gap-3 rounded-xl border border-border bg-card p-3"
            >
              <div className="flex size-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <ws.icon className="size-4" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{ws.name}</p>
                <p className="truncate text-xs text-muted-foreground">{ws.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {RESOURCES.slice(0, 4).map((res) => (
            <div
              key={res.title}
              className="flex items-center gap-3 rounded-xl border border-border bg-card p-3"
            >
              <div className={`flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted ${res.color}`}>
                <TypeIcon type={res.type} className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{res.title}</p>
                <div className="mt-1 flex items-center gap-1.5">
                  <span className="rounded-full bg-accent/40 px-2 py-0.5 text-[11px] font-medium text-accent-foreground">
                    #{res.tag}
                  </span>
                  <span className="text-[11px] text-muted-foreground">1,2 MB</span>
                </div>
              </div>
              <Star className="size-4 fill-amber-400 text-amber-400" aria-hidden="true" />
            </div>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button size="sm">Tạo mới</Button>
          <Button size="sm" variant="outline">
            <UploadOutline />
            Tải tệp lên
          </Button>
          <Button size="sm" variant="secondary">Sửa</Button>
          <Button size="sm" variant="destructive">Xóa</Button>
          <span className="ml-2 flex items-center gap-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1 text-emerald-600">
              <Check className="size-3" aria-hidden="true" /> Sẵn sàng
            </span>
          </span>
        </div>

        <div className="mt-4 rounded-xl border border-border bg-card p-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium">Đang tải “Đề cương hàm số.pdf”</span>
            <span className="text-muted-foreground">62%</span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full w-[62%] rounded-full bg-primary" />
          </div>
        </div>
      </div>
    </div>
  );
}

function UploadOutline() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-4" aria-hidden="true">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="M17 8l-5-5-5 5" />
      <path d="M12 3v12" />
    </svg>
  );
}

export default function MauPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">
        Chọn mẫu màu cho TBZ School
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Ba mẫu dưới đây cùng nội dung, chỉ khác bảng màu. Gửi mình tên mẫu bạn thích để áp dụng lên toàn bộ giao diện.
      </p>

      <div className="mt-8 grid gap-8 lg:grid-cols-1 xl:grid-cols-3">
        {THEMES.map((theme, index) => (
          <div key={theme.id}>
            <div className="mb-2 flex items-center gap-2">
              <span className="rounded-md bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">
                Mẫu {index + 1}
              </span>
              <h2 className="text-base font-semibold">{theme.name}</h2>
            </div>
            <p className="mb-3 text-xs text-muted-foreground">{theme.note}</p>
            <ThemePreview theme={theme} />
          </div>
        ))}
      </div>
    </div>
  );
}