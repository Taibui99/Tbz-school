"use client";

import { useState, type CSSProperties } from "react";
import { Star, Search, BookOpen, FolderOpen, Check, Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TypeIcon } from "@/components/resource/type-icon";
import {
  generateTokens,
  PALETTES,
  PALETTE_FAMILIES,
  PRIMARY_COLORS,
  ACCENT_COLORS,
  oklch,
  type ThemeMode,
} from "@/lib/theme";

type Tokens = Record<string, string>;

const WORKSPACES = [
  { name: "Kho Toán 11", desc: "12 bài · 34 tài liệu", icon: BookOpen },
  { name: "Kho Hóa 10", desc: "15 bài · 40 tài liệu", icon: FolderOpen },
];

const RESOURCES: { title: string; type: string; tag: string; color: string }[] = [
  { title: "Đề cương hàm số", type: "pdf", tag: "toán", color: "text-red-600" },
  { title: "Bài giảng đạo hàm", type: "pptx", tag: "toán", color: "text-orange-600" },
  { title: "Bảng tuần hoàn", type: "xlsx", tag: "hóa", color: "text-emerald-600" },
  { title: "Thí nghiệm điện phân", type: "video", tag: "hóa", color: "text-violet-600" },
];

function UploadIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-4" aria-hidden="true">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="M17 8l-5-5-5 5" />
      <path d="M12 3v12" />
    </svg>
  );
}

function MiniPreview({ tokens, mode }: { tokens: Tokens; mode: ThemeMode }) {
  const dark = mode === "dark";
  return (
    <div
      className={`overflow-hidden rounded-xl border border-border bg-background text-foreground ${dark ? "dark" : ""}`}
      style={tokens as CSSProperties}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-muted/60 px-3 py-2">
        <div className="flex items-center gap-1.5">
          <div className="flex size-5 items-center justify-center rounded bg-primary text-[11px] font-bold text-primary-foreground">
            T
          </div>
          <span className="text-xs font-semibold">TBZ School</span>
        </div>
        <div className="flex items-center gap-1 rounded-full bg-card px-2 py-0.5 text-[10px] text-muted-foreground">
          <Search className="size-3" aria-hidden="true" />
          Tìm kiếm…
        </div>
      </div>

      <div className="p-3">
        <div className="flex items-baseline justify-between">
          <h4 className="text-sm font-semibold">Kho của tôi</h4>
          <span className="text-[10px] text-muted-foreground">2 kho · 74 tài liệu</span>
        </div>

        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {WORKSPACES.map((ws) => (
            <div key={ws.name} className="flex items-center gap-2 rounded-lg border border-border bg-card p-2">
              <div className="flex size-7 items-center justify-center rounded-md bg-primary/15 text-primary">
                <ws.icon className="size-3.5" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-[11px] font-medium">{ws.name}</p>
                <p className="truncate text-[10px] text-muted-foreground">{ws.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {RESOURCES.map((res) => (
            <div key={res.title} className="flex items-center gap-2 rounded-lg border border-border bg-card p-2">
              <div className={`flex size-7 shrink-0 items-center justify-center rounded-md bg-muted ${res.color}`}>
                <TypeIcon type={res.type} className="size-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[11px] font-medium">{res.title}</p>
                <span className="rounded-full bg-accent/40 px-1.5 py-0.5 text-[9px] font-medium text-accent-foreground">
                  #{res.tag}
                </span>
              </div>
              <Star className="size-3 fill-amber-400 text-amber-400" aria-hidden="true" />
            </div>
          ))}
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <Button size="sm" className="h-7 px-2.5 text-[11px]">Tạo mới</Button>
          <Button size="sm" variant="outline" className="h-7 px-2.5 text-[11px]">
            <UploadIcon />
            Tải tệp
          </Button>
          <Button size="sm" variant="destructive" className="h-7 px-2.5 text-[11px]">Xóa</Button>
        </div>

        <div className="mt-2 rounded-lg border border-border bg-card p-2">
          <div className="flex items-center justify-between text-[10px]">
            <span className="font-medium">Đang tải “Đề cương.pdf”</span>
            <span className="text-muted-foreground">62%</span>
          </div>
          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full w-[62%] rounded-full bg-primary" />
          </div>
        </div>
      </div>
    </div>
  );
}

function Swatch({
  label,
  color,
  selected,
  onClick,
}: {
  label: string;
  color: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`flex flex-col items-center gap-1 rounded-lg p-1.5 transition ${selected ? "ring-2 ring-foreground" : "hover:bg-muted"}`}
    >
      <span
        className="size-8 rounded-full border border-black/10 shadow-sm dark:border-white/20"
        style={{ backgroundColor: color }}
      />
      <span className={`text-[10px] ${selected ? "font-semibold" : "text-muted-foreground"}`}>{label}</span>
    </button>
  );
}

const SWATCH_LIGHT: Record<string, string> = {
  blue: oklch(0.55, 0.18, 256),
  sky: oklch(0.6, 0.13, 235),
  indigo: oklch(0.52, 0.2, 270),
  navy: oklch(0.42, 0.14, 260),
  violet: oklch(0.55, 0.2, 295),
  purple: oklch(0.5, 0.22, 310),
  magenta: oklch(0.55, 0.25, 340),
  crimson: oklch(0.55, 0.22, 25),
  teal: oklch(0.55, 0.15, 190),
  green: oklch(0.55, 0.16, 165),
  slate: oklch(0.5, 0.05, 260),
  pine: oklch(0.5, 0.14, 170),
};

const SWATCH_ACCENT: Record<string, string> = {
  amber: oklch(0.82, 0.13, 78),
  coral: oklch(0.75, 0.16, 30),
  pink: oklch(0.72, 0.16, 350),
  cyan: oklch(0.78, 0.12, 195),
  lime: oklch(0.85, 0.2, 130),
  mint: oklch(0.82, 0.12, 165),
  teal: oklch(0.72, 0.12, 190),
};

export default function MauPage() {
  const [mode, setMode] = useState<ThemeMode>("light");
  const [primaryKey, setPrimaryKey] = useState<keyof typeof PRIMARY_COLORS>("blue");
  const [accentKey, setAccentKey] = useState<keyof typeof ACCENT_COLORS>("amber");

  const customTokens = generateTokens(PRIMARY_COLORS[primaryKey], ACCENT_COLORS[accentKey], mode);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Chọn mẫu màu cho TBZ School</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            12 gói màu sẵn theo 4 nhóm + ghép tùy ý bên dưới. Gửi mình tên mẫu (hoặc tổ hợp tự chọn) để áp dụng lên toàn bộ giao diện.
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-full border border-border bg-muted p-1">
          {(["light", "dark"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition ${
                mode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {m === "light" ? <Sun className="size-3.5" aria-hidden="true" /> : <Moon className="size-3.5" aria-hidden="true" />}
              {m === "light" ? "Sáng" : "Tối"}
            </button>
          ))}
        </div>
      </div>

      {PALETTE_FAMILIES.map((family) => (
        <section key={family} className="mt-8">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            {family}
            <span className="flex gap-1">
              {PALETTES.filter((p) => p.family === family).map((p) => (
                <span
                  key={p.id}
                  className="size-3 rounded-full border border-black/10 dark:border-white/20"
                  style={{ backgroundColor: oklch(PRIMARY_COLORS[p.primary].l, PRIMARY_COLORS[p.primary].c, PRIMARY_COLORS[p.primary].h) }}
                />
              ))}
            </span>
          </h2>
          <div className="mt-3 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {PALETTES.filter((p) => p.family === family).map((p) => {
              const tokens = generateTokens(PRIMARY_COLORS[p.primary], ACCENT_COLORS[p.accent], mode);
              return (
                <div key={p.id}>
                  <div className="mb-1.5 flex items-center gap-2">
                    <span className="rounded bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground">
                      {p.name}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      Mẫu #{PALETTES.indexOf(p) + 1}
                    </span>
                  </div>
                  <MiniPreview tokens={tokens} mode={mode} />
                </div>
              );
            })}
          </div>
        </section>
      ))}

      <section className="mt-10 rounded-2xl border border-border bg-card p-5">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          Tự ghép màu
          <span className="text-xs font-normal text-muted-foreground">
            chọn 1 màu chủ + 1 màu nhấn ({primaryKey} + {accentKey})
          </span>
        </h2>
        <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_320px]">
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Màu chủ</p>
            <div className="flex flex-wrap gap-1">
              {Object.entries(SWATCH_LIGHT).map(([key, color]) => (
                <Swatch
                  key={key}
                  label={key}
                  color={color}
                  selected={primaryKey === key}
                  onClick={() => setPrimaryKey(key as keyof typeof PRIMARY_COLORS)}
                />
              ))}
            </div>
            <p className="mb-2 mt-5 text-xs font-medium uppercase tracking-wide text-muted-foreground">Màu nhấn</p>
            <div className="flex flex-wrap gap-1">
              {Object.entries(SWATCH_ACCENT).map(([key, color]) => (
                <Swatch
                  key={key}
                  label={key}
                  color={color}
                  selected={accentKey === key}
                  onClick={() => setAccentKey(key as keyof typeof ACCENT_COLORS)}
                />
              ))}
            </div>
          </div>
          <div>
            <div className="mb-1.5 flex items-center gap-2">
              <span className="rounded bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground">
                Combo của bạn
              </span>
            </div>
            <MiniPreview tokens={customTokens} mode={mode} />
            <div className="mt-2 flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
              <Check className="size-4 text-emerald-500" aria-hidden="true" />
              Tổ hợp <span className="font-semibold text-foreground">{primaryKey} + {accentKey}</span> — {mode === "light" ? "sáng" : "tối"}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}