import Link from "next/link";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-5 px-4 py-24 text-center">
      <span className="bg-brand-gradient flex size-16 items-center justify-center rounded-3xl text-white shadow-[var(--glow-brand)]">
        <Compass className="size-8" aria-hidden="true" />
      </span>
      <p className="font-heading text-gradient text-6xl font-extrabold tracking-tight">
        404
      </p>
      <h2 className="font-heading text-2xl font-bold tracking-tight">
        Không tìm thấy trang
      </h2>
      <p className="max-w-md text-sm text-muted-foreground">
        Trang bạn tìm kiếm không tồn tại hoặc đã bị di chuyển.
      </p>
      <Button size="lg" render={<Link href="/" />}>
        Về trang chủ
      </Button>
    </div>
  );
}
