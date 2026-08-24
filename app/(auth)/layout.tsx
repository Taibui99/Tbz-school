import type { ReactNode } from "react";
import { GraduationCap, Lock, Share2, Sparkles } from "lucide-react";

const highlights = [
  {
    icon: Lock,
    text: "Tài liệu riêng tư, bảo vệ bởi quyền trên máy chủ",
  },
  {
    icon: Sparkles,
    text: "Chú thích, ghi chú không làm thay đổi file gốc",
  },
  {
    icon: Share2,
    text: "Chia sẻ đúng mức — từ riêng tư đến công khai",
  },
];

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto grid w-full max-w-6xl flex-1 items-center gap-10 px-4 py-12 lg:grid-cols-[1.1fr_1fr]">
      <section aria-hidden="true" className="hidden flex-col gap-8 lg:flex">
        <div className="flex items-center gap-3">
          <span className="bg-brand-gradient flex size-12 items-center justify-center rounded-2xl text-white shadow-[var(--glow-brand)]">
            <GraduationCap className="size-6" aria-hidden="true" />
          </span>
          <span className="font-heading text-2xl font-bold tracking-tight">
            Tbz <span className="text-gradient">Cloud</span>
          </span>
        </div>
        <h2 className="font-heading max-w-md text-4xl font-extrabold leading-tight tracking-tight">
          Không gian học tập{" "}
          <span className="text-gradient">có tổ chức của bạn</span>
        </h2>
        <ul className="flex flex-col gap-4">
          {highlights.map((item) => (
            <li
              key={item.text}
              className="glass-panel flex items-center gap-3.5 rounded-2xl px-5 py-4"
            >
              <span className="bg-brand-gradient flex size-9 shrink-0 items-center justify-center rounded-xl text-white">
                <item.icon className="size-4.5" aria-hidden="true" />
              </span>
              <span className="text-sm font-medium">{item.text}</span>
            </li>
          ))}
        </ul>
      </section>
      <div className="mx-auto flex w-full max-w-md flex-col justify-center">
        {children}
      </div>
    </div>
  );
}
