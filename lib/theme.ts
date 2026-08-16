export type Oklch = { l: number; c: number; h: number };

export type ThemeMode = "light" | "dark";

export const oklch = (l: number, c: number, h: number): string =>
  `oklch(${l.toFixed(3)} ${c.toFixed(3)} ${h.toFixed(1)})`;

export function adjust(
  color: Oklch,
  { l, c, h }: { l?: number; c?: number; h?: number } = {},
): Oklch {
  return {
    l: l ?? color.l,
    c: c ?? color.c,
    h: h ?? color.h,
  };
}

export const PRIMARY_COLORS: Record<string, Oklch> = {
  blue: { l: 0.55, c: 0.18, h: 256 },
  sky: { l: 0.6, c: 0.13, h: 235 },
  indigo: { l: 0.52, c: 0.2, h: 270 },
  navy: { l: 0.42, c: 0.14, h: 260 },
  violet: { l: 0.55, c: 0.2, h: 295 },
  purple: { l: 0.5, c: 0.22, h: 310 },
  magenta: { l: 0.55, c: 0.25, h: 340 },
  crimson: { l: 0.55, c: 0.22, h: 25 },
  teal: { l: 0.55, c: 0.15, h: 190 },
  green: { l: 0.55, c: 0.16, h: 165 },
  slate: { l: 0.5, c: 0.05, h: 260 },
  pine: { l: 0.5, c: 0.14, h: 170 },
};

export const ACCENT_COLORS: Record<string, Oklch> = {
  amber: { l: 0.82, c: 0.13, h: 78 },
  coral: { l: 0.75, c: 0.16, h: 30 },
  pink: { l: 0.72, c: 0.16, h: 350 },
  cyan: { l: 0.78, c: 0.12, h: 195 },
  lime: { l: 0.85, c: 0.2, h: 130 },
  mint: { l: 0.82, c: 0.12, h: 165 },
  teal: { l: 0.72, c: 0.12, h: 190 },
};

type NamedColor = keyof typeof PRIMARY_COLORS;
type NamedAccent = keyof typeof ACCENT_COLORS;

export const PALETTES: {
  id: string;
  name: string;
  family: string;
  primary: NamedColor;
  accent: NamedAccent;
}[] = [
  { id: "blue-amber", name: "Xanh dương + Cam", family: "Cool", primary: "blue", accent: "amber" },
  { id: "sky-cyan", name: "Trời + Xanh ngọc", family: "Cool", primary: "sky", accent: "cyan" },
  { id: "navy-gold", name: "Chàm + Vàng kim", family: "Cool", primary: "navy", accent: "amber" },
  { id: "violet-pink", name: "Tím + Hồng", family: "Vibrant", primary: "violet", accent: "pink" },
  { id: "purple-amber", name: "Tím cà + Cam", family: "Vibrant", primary: "purple", accent: "amber" },
  { id: "crimson-coral", name: "Đỏ + San hô", family: "Vibrant", primary: "crimson", accent: "coral" },
  { id: "magenta-lime", name: "Hồng cánh sen + Chanh", family: "Vibrant", primary: "magenta", accent: "lime" },
  { id: "green-amber", name: "Xanh lá + Vàng", family: "Natural", primary: "green", accent: "amber" },
  { id: "teal-coral", name: "Xanh mòng két + San hô", family: "Natural", primary: "teal", accent: "coral" },
  { id: "pine-mint", name: "Thông + Bạc hà", family: "Natural", primary: "pine", accent: "mint" },
  { id: "slate-teal", name: "Xám khói + Xanh ngọc", family: "Calm", primary: "slate", accent: "teal" },
  { id: "indigo-pink", name: "Chàm tím + Hồng", family: "Calm", primary: "indigo", accent: "pink" },
];

export const PALETTE_FAMILIES = ["Cool", "Vibrant", "Natural", "Calm"] as const;

function chartTokens(primary: string, accent: string, mode: ThemeMode): Record<string, string> {
  if (mode === "dark") {
    return {
      "--chart-1": primary,
      "--chart-2": accent,
      "--chart-3": oklch(0.68, 0.14, 165),
      "--chart-4": oklch(0.68, 0.16, 295),
      "--chart-5": oklch(0.74, 0.13, 25),
    };
  }
  return {
    "--chart-1": primary,
    "--chart-2": accent,
    "--chart-3": oklch(0.7, 0.17, 165),
    "--chart-4": oklch(0.6, 0.19, 295),
    "--chart-5": oklch(0.65, 0.15, 350),
  };
}

export function generateTokens(
  primary: Oklch,
  accent: Oklch,
  mode: ThemeMode,
): Record<string, string> {
  const baseHue = primary.h;
  const fgLight = oklch(0.21, 0.03, baseHue);
  const bgLight = oklch(0.985, 0.008, baseHue);
  const cardLight = "oklch(1 0 0)";

  const primaryBright = oklch(
    Math.min(primary.l + 0.14, 0.95),
    Math.min(primary.c + 0.03, 0.3),
    primary.h,
  );
  const accentBright = oklch(
    Math.min(accent.l + 0.1, 0.95),
    Math.min(accent.c + 0.03, 0.3),
    accent.h,
  );
  const bgDark = oklch(0.16, 0.02, baseHue);
  const fgDark = oklch(0.93, 0.012, baseHue);
  const cardDark = oklch(0.2, 0.02, baseHue);
  const darkText = oklch(0.16, 0.02, baseHue);

  const primaryCss = oklch(primary.l, primary.c, primary.h);
  const accentCss = oklch(accent.l, accent.c, accent.h);

  if (mode === "dark") {
    return {
      "--background": bgDark,
      "--foreground": fgDark,
      "--card": cardDark,
      "--card-foreground": fgDark,
      "--popover": cardDark,
      "--popover-foreground": fgDark,
      "--primary": primaryBright,
      "--primary-foreground": darkText,
      "--secondary": oklch(0.26, 0.02, baseHue),
      "--secondary-foreground": fgDark,
      "--muted": oklch(0.24, 0.02, baseHue),
      "--muted-foreground": oklch(0.7, 0.02, baseHue),
      "--accent": accentBright,
      "--accent-foreground": oklch(0.2, 0.02, accent.h),
      "--destructive": oklch(0.704, 0.191, 22.2),
      "--border": "oklch(1 0 0 / 10%)",
      "--input": "oklch(1 0 0 / 15%)",
      "--ring": primaryBright,
      "--sidebar": cardDark,
      "--sidebar-foreground": fgDark,
      "--sidebar-primary": primaryBright,
      "--sidebar-primary-foreground": darkText,
      "--sidebar-accent": oklch(0.26, 0.02, baseHue),
      "--sidebar-accent-foreground": fgDark,
      "--sidebar-border": "oklch(1 0 0 / 10%)",
      "--sidebar-ring": primaryBright,
      ...chartTokens(primaryBright, accentBright, mode),
    };
  }

  return {
    "--background": bgLight,
    "--foreground": fgLight,
    "--card": cardLight,
    "--card-foreground": fgLight,
    "--popover": cardLight,
    "--popover-foreground": fgLight,
    "--primary": primaryCss,
    "--primary-foreground": "oklch(0.985 0 0)",
    "--secondary": oklch(0.94, 0.02, baseHue),
    "--secondary-foreground": oklch(0.35, 0.07, baseHue),
    "--muted": oklch(0.95, 0.012, baseHue),
    "--muted-foreground": oklch(0.55, 0.02, baseHue),
    "--accent": accentCss,
    "--accent-foreground": oklch(0.25, 0.05, accent.h),
    "--destructive": oklch(0.577, 0.245, 27.3),
    "--border": oklch(0.9, 0.015, baseHue),
    "--input": oklch(0.9, 0.015, baseHue),
    "--ring": primaryCss,
    "--sidebar": oklch(0.97, 0.008, baseHue),
    "--sidebar-foreground": fgLight,
    "--sidebar-primary": primaryCss,
    "--sidebar-primary-foreground": "oklch(0.985 0 0)",
    "--sidebar-accent": oklch(0.94, 0.02, baseHue),
    "--sidebar-accent-foreground": oklch(0.35, 0.07, baseHue),
    "--sidebar-border": oklch(0.9, 0.015, baseHue),
    "--sidebar-ring": primaryCss,
    ...chartTokens(primaryCss, accentCss, mode),
  };
}