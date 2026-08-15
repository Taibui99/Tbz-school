import {
  BookOpen,
  FolderTree,
  Library,
  Lock,
  Search,
  Share2,
  Sparkles,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const steps = [
  { icon: FolderTree, label: "Workspace" },
  { icon: Library, label: "Collection" },
  { icon: BookOpen, label: "Lesson" },
  { icon: Upload, label: "Resource" },
];

const features = [
  {
    icon: Lock,
    title: "Quyền riêng tư do máy chủ bảo vệ",
    description:
      "Tài liệu riêng tư chỉ truy cập qua ủy quyền và liên kết ký có thời hạn — không bao giờ lộ công khai.",
  },
  {
    icon: Share2,
    title: "Chia sẻ linh hoạt",
    description:
      "Riêng tư, ẩn theo liên kết, công khai hoặc chia sẻ cho người cụ thể — đúng mức bạn muốn.",
  },
  {
    icon: Sparkles,
    title: "Chú thích không làm đổi file gốc",
    description:
      "Đánh dấu, ghi chú, bookmark nằm tách biệt — file gốc luôn nguyên vẹn.",
  },
  {
    icon: Search,
    title: "Khám phá tài liệu công khai",
    description:
      "Tìm kiếm và tham khảo tài liệu học tập công khai từ cộng đồng.",
  },
];

export default function Home() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4">
      <section className="flex flex-col items-center gap-6 py-20 text-center sm:py-28">
        <p className="rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
          Nền tảng lưu trữ &amp; tương tác tài liệu học tập
        </p>
        <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
          Học tập có tổ chức, tài liệu luôn trong tầm tay
        </h1>
        <p className="max-w-xl text-lg text-muted-foreground">
          Lưu trữ, sắp xếp, mở trực tiếp trong trình duyệt, chú thích và chia sẻ
          tài liệu học tập của bạn — đúng mức quyền riêng tư bạn muốn.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button size="lg" render={<a href="#caau-truc" />}>
            Tìm hiểu cấu trúc
          </Button>
          <Button size="lg" variant="outline" render={<a href="#tinh-nang" />}>
            Xem tính năng
          </Button>
        </div>
      </section>

      <section
        id="caau-truc"
        aria-labelledby="caau-truc-tieu-de"
        className="scroll-mt-20 py-16"
      >
        <h2
          id="caau-truc-tieu-de"
          className="text-center text-2xl font-semibold tracking-tight"
        >
          Mô hình tổ chức đơn giản
        </h2>
        <ol className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {steps.map((step, index) => (
            <li
              key={step.label}
              className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card p-6 text-center"
            >
              <step.icon className="size-6 text-muted-foreground" aria-hidden="true" />
              <span className="text-sm font-medium">{step.label}</span>
              <span className="text-xs text-muted-foreground">
                Bước {index + 1} trong chuỗi tổ chức
              </span>
            </li>
          ))}
        </ol>
      </section>

      <section
        id="tinh-nang"
        aria-labelledby="tinh-nang-tieu-de"
        className="scroll-mt-20 py-16"
      >
        <h2
          id="tinh-nang-tieu-de"
          className="text-center text-2xl font-semibold tracking-tight"
        >
          Tính năng chính
        </h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {features.map((feature) => (
            <article
              key={feature.title}
              className="flex flex-col gap-3 rounded-xl border border-border bg-card p-6"
            >
              <feature.icon className="size-6" aria-hidden="true" />
              <h3 className="font-medium">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">
                {feature.description}
              </p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}