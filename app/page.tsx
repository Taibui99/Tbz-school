import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import {
  ArrowRight,
  BookOpen,
  FileText,
  FolderTree,
  Library,
  Lock,
  PenLine,
  Share2,
  ShieldCheck,
  Upload,
  Video,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SpotlightCard } from "@/components/layout/spotlight-card";
import { Reveal } from "@/components/layout/reveal";

const steps = [
  { icon: FolderTree, label: "Workspace", tint: "from-violet-500/20 to-violet-500/5 text-violet-600 dark:text-violet-300" },
  { icon: Library, label: "Collection", tint: "from-fuchsia-500/20 to-fuchsia-500/5 text-fuchsia-600 dark:text-fuchsia-300" },
  { icon: BookOpen, label: "Lesson", tint: "from-sky-500/20 to-sky-500/5 text-sky-600 dark:text-sky-300" },
  { icon: Upload, label: "Resource", tint: "from-amber-500/20 to-amber-500/5 text-amber-600 dark:text-amber-300" },
];

const formatChips = [
  "PDF",
  "DOCX",
  "PPTX",
  "XLSX",
  "Ảnh",
  "Video",
  "Âm thanh",
  "Markdown",
];

function HeroChip({
  className,
  icon,
  label,
  tilt,
  slow,
}: {
  className: string;
  icon: ReactNode;
  label: string;
  tilt?: string;
  slow?: boolean;
}) {
  return (
    <div
      aria-hidden="true"
      style={tilt ? ({ "--tilt": tilt } as CSSProperties) : undefined}
      className={`glass-panel absolute z-10 hidden items-center gap-2.5 rounded-2xl px-4 py-3 lg:flex ${
        slow ? "float-y-slow" : "float-y"
      } ${className}`}
    >
      {icon}
      <span className="text-sm font-semibold">{label}</span>
    </div>
  );
}

export default function Home() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4">
      <section className="relative flex flex-col items-center gap-7 py-24 text-center sm:py-32">
        <HeroChip
          className="left-[2%] top-[22%]"
          icon={
            <span className="flex size-8 items-center justify-center rounded-lg bg-red-500/15 text-red-500">
              <FileText className="size-4" />
            </span>
          }
          label="Bai-giang.pdf"
          tilt="-3deg"
        />
        <HeroChip
          className="right-[3%] top-[18%]"
          icon={
            <span className="bg-brand-gradient flex size-8 items-center justify-center rounded-lg text-white">
              <Video className="size-4" />
            </span>
          }
          label="Video bài giảng"
          tilt="3deg"
          slow
        />
        <HeroChip
          className="bottom-[26%] left-[7%]"
          icon={
            <span className="flex size-8 items-center justify-center rounded-lg bg-sky-500/15 text-sky-500">
              <PenLine className="size-4" />
            </span>
          }
          label="Ghi chú của tôi"
          tilt="2deg"
          slow
        />
        <HeroChip
          className="bottom-[30%] right-[6%]"
          icon={
            <span className="flex size-8 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-500">
              <ShieldCheck className="size-4" />
            </span>
          }
          label="Riêng tư 100%"
          tilt="-2deg"
        />

        <Reveal>
          <p className="glass-panel rounded-full px-4 py-1.5 text-xs font-semibold tracking-wide text-muted-foreground">
            Nền tảng lưu trữ &amp; tương tác tài liệu học tập
          </p>
        </Reveal>
        <Reveal delay={80}>
          <h1 className="font-heading max-w-3xl text-4xl font-extrabold leading-[1.12] tracking-tight text-balance sm:text-7xl">
            Học tập có tổ chức,{" "}
            <span className="text-gradient shimmer-text">
              tài liệu trong tầm tay
            </span>
          </h1>
        </Reveal>
        <Reveal delay={160}>
          <p className="max-w-xl text-lg text-muted-foreground">
            Lưu trữ, sắp xếp, mở trực tiếp trong trình duyệt, chú thích và chia sẻ
            tài liệu học tập của bạn — đúng mức quyền riêng tư bạn muốn.
          </p>
        </Reveal>
        <Reveal delay={240}>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button size="lg" render={<a href="/dang-ky" />}>
              Bắt đầu ngay — miễn phí
              <ArrowRight aria-hidden="true" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              render={<a href="#cau-truc" />}
            >
              Tìm hiểu cấu trúc
            </Button>
          </div>
        </Reveal>
        <Reveal delay={320}>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-x-7 gap-y-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="size-4 text-emerald-500" aria-hidden="true" />
              Riêng tư mặc định
            </span>
            <span className="flex items-center gap-1.5">
              <BookOpen className="size-4 text-violet-500" aria-hidden="true" />
              Xem ngay trên trình duyệt
            </span>
            <span className="flex items-center gap-1.5">
              <Share2 className="size-4 text-fuchsia-500" aria-hidden="true" />
              Chia sẻ đúng mức
            </span>
          </div>
        </Reveal>
      </section>

      <section
        id="cau-truc"
        aria-labelledby="cau-truc-tieu-de"
        className="scroll-mt-24 py-14"
      >
        <Reveal>
          <h2
            id="cau-truc-tieu-de"
            className="font-heading text-center text-3xl font-bold tracking-tight sm:text-4xl"
          >
            Mô hình tổ chức <span className="text-gradient">đơn giản</span>
          </h2>
        </Reveal>
        <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {steps.map((step, index) => (
            <Reveal key={step.label} delay={index * 90}>
              <SpotlightCard className="glass-panel group h-full rounded-3xl p-6 text-center transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[var(--shadow-lift)]">
                <span
                  className={`mx-auto mb-4 flex size-13 items-center justify-center rounded-2xl bg-gradient-to-br ${step.tint} transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6`}
                >
                  <step.icon className="size-6" aria-hidden="true" />
                </span>
                <span className="font-heading font-bold">{step.label}</span>
                <p className="mt-1 text-xs text-muted-foreground">
                  Bước {index + 1} trong chuỗi tổ chức
                </p>
              </SpotlightCard>
            </Reveal>
          ))}
        </div>
      </section>

      <section
        id="tinh-nang"
        aria-labelledby="tinh-nang-tieu-de"
        className="scroll-mt-24 py-14"
      >
        <Reveal>
          <h2
            id="tinh-nang-tieu-de"
            className="font-heading text-center text-3xl font-bold tracking-tight sm:text-4xl"
          >
            Tất cả trong <span className="text-gradient">một nơi</span>
          </h2>
        </Reveal>
        <div className="mt-10 grid auto-rows-[minmax(180px,auto)] grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Reveal className="sm:col-span-2 lg:row-span-2">
            <SpotlightCard className="glass-panel group relative h-full overflow-hidden rounded-3xl p-7">
              <span className="bg-brand-gradient mb-5 flex size-12 items-center justify-center rounded-2xl text-white shadow-[var(--glow-brand)]">
                <FolderTree className="size-6" aria-hidden="true" />
              </span>
              <h3 className="font-heading text-xl font-bold">
                Kho tài liệu kiểu trình quản lý tệp
              </h3>
              <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
                Cây thư mục Workspace → Collection → Lesson quen thuộc như Google
                Drive. Kéo thả nhiều tệp cùng lúc, hệ thống tự sắp xếp vào chỗ
                đúng.
              </p>
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-4 bottom-0 top-24 hidden w-56 select-none flex-col justify-center gap-1.5 opacity-90 lg:flex"
              >
                {[
                  { name: "Kỳ 1 · Toán", depth: 0, folder: true },
                  { name: "Chương 1 — Hàm số", depth: 1, folder: true },
                  { name: "Bai-giang.pdf", depth: 2, folder: false },
                  { name: "De-cuong-trong-tam.docx", depth: 2, folder: false },
                  { name: "Chương 2 — Hệ thức", depth: 1, folder: true },
                  { name: "video-tra-nghiem.mp4", depth: 2, folder: false },
                ].map((row, i) => (
                  <span
                    key={row.name}
                    style={{ paddingLeft: `${row.depth * 18}px` }}
                    className={`flex items-center gap-2 rounded-lg border border-transparent px-2 py-1 text-xs ${
                      i === 2
                        ? "border-violet-500/30 bg-violet-500/10 font-medium text-violet-700 dark:text-violet-200"
                        : "text-muted-foreground"
                    }`}
                  >
                    {row.folder ? (
                      <Library className="size-3.5 shrink-0 text-fuchsia-400" />
                    ) : (
                      <FileText className="size-3.5 shrink-0 text-sky-400" />
                    )}
                    <span className="truncate">{row.name}</span>
                  </span>
                ))}
              </div>
            </SpotlightCard>
          </Reveal>

          <Reveal delay={60}>
            <SpotlightCard className="glass-panel group h-full rounded-3xl p-6 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[var(--shadow-lift)]">
              <span className="mb-4 flex size-11 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600 transition-transform duration-300 group-hover:scale-110 dark:text-emerald-300">
                <Lock className="size-5" aria-hidden="true" />
              </span>
              <h3 className="font-heading font-bold">Riêng tư tuyệt đối</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                Liên kết ký có thời hạn — không bao giờ lộ công khai.
              </p>
            </SpotlightCard>
          </Reveal>

          <Reveal delay={120}>
            <SpotlightCard className="glass-panel group h-full rounded-3xl p-6 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[var(--shadow-lift)]">
              <span className="mb-4 flex size-11 items-center justify-center rounded-xl bg-fuchsia-500/15 text-fuchsia-600 transition-transform duration-300 group-hover:scale-110 dark:text-fuchsia-300">
                <Share2 className="size-5" aria-hidden="true" />
              </span>
              <h3 className="font-heading font-bold">Chia sẻ linh hoạt</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                Từ riêng tư đến công khai — đúng mức bạn muốn.
              </p>
            </SpotlightCard>
          </Reveal>

          <Reveal delay={60} className="sm:col-span-2">
            <SpotlightCard className="glass-panel group h-full overflow-hidden rounded-3xl p-6">
              <h3 className="font-heading font-bold">Xem mọi định dạng</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Mở trực tiếp trong trình duyệt, không cần cài gì thêm.
              </p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {formatChips.map((chip) => (
                  <span
                    key={chip}
                    className="rounded-full border border-border bg-card/70 px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors group-hover:border-primary/30"
                  >
                    {chip}
                  </span>
                ))}
              </div>
            </SpotlightCard>
          </Reveal>

          <Reveal delay={100} className="sm:col-span-2">
            <SpotlightCard className="glass-panel bg-brand-gradient group relative h-full overflow-hidden rounded-3xl p-6 text-white">
              <div
                aria-hidden="true"
                className="absolute -right-10 -top-10 size-36 rounded-full bg-white/15 blur-2xl"
              />
              <span className="mb-4 flex size-11 items-center justify-center rounded-xl bg-white/20">
                <Video className="size-5" aria-hidden="true" />
              </span>
              <h3 className="font-heading font-bold">Video không giới hạn</h3>
              <p className="mt-1.5 max-w-xs text-sm leading-relaxed text-white/85">
                Tải video thẳng lên YouTube qua kênh trung tâm — không tốn dung
                lượng lưu trữ của bạn.
              </p>
            </SpotlightCard>
          </Reveal>

          <Reveal delay={140}>
            <SpotlightCard className="glass-panel group h-full rounded-3xl p-6 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[var(--shadow-lift)]">
              <span className="mb-4 flex size-11 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 transition-transform duration-300 group-hover:scale-110 dark:text-amber-300">
                <PenLine className="size-5" aria-hidden="true" />
              </span>
              <h3 className="font-heading font-bold">Chú thích an toàn</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                Ghi chú tách biệt — file gốc luôn nguyên vẹn.
              </p>
            </SpotlightCard>
          </Reveal>

          <Reveal delay={180}>
            <SpotlightCard className="glass-panel group h-full rounded-3xl p-6 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[var(--shadow-lift)]">
              <span className="mb-4 flex size-11 items-center justify-center rounded-xl bg-sky-500/15 text-sky-600 transition-transform duration-300 group-hover:scale-110 dark:text-sky-300">
                <ArrowRight className="size-5 rotate-45" aria-hidden="true" />
              </span>
              <h3 className="font-heading font-bold">Khám phá cộng đồng</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                Tham khảo tài liệu công khai từ người khác.
              </p>
            </SpotlightCard>
          </Reveal>
        </div>
      </section>

      <section aria-labelledby="cta-tieu-de" className="py-14">
        <Reveal>
          <div className="border-beam bg-brand-gradient grain relative overflow-hidden rounded-[2rem] px-8 py-16 text-center text-white shadow-[var(--shadow-lift)]">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -top-24 left-1/4 size-64 rounded-full bg-white/15 blur-3xl"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-28 right-1/5 size-72 rounded-full bg-white/10 blur-3xl"
            />
            <h2
              id="cta-tieu-de"
              className="font-heading relative z-10 text-3xl font-bold tracking-tight text-balance sm:text-4xl"
            >
              Sẵn sàng học tập có tổ chức?
            </h2>
            <p className="relative z-10 mx-auto mt-3 max-w-md text-white/85">
              Tạo tài khoản miễn phí và bắt đầu sắp xếp tài liệu của bạn ngay
              hôm nay.
            </p>
            <div className="relative z-10 mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button
                size="lg"
                className="bg-white text-violet-700 shadow-none hover:bg-white/90"
                render={<Link href="/dang-ky" />}
              >
                Tạo tài khoản miễn phí
              </Button>
              <Button
                size="lg"
                variant="ghost"
                className="border border-white/40 text-white hover:bg-white/15 hover:text-white"
                render={<Link href="/kham-pha" />}
              >
                Khám phá tài liệu
              </Button>
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
