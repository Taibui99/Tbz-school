import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-24 text-center">
      <p className="text-6xl font-semibold tracking-tight">404</p>
      <h2 className="text-2xl font-semibold tracking-tight">
        Không tìm thấy trang
      </h2>
      <p className="max-w-md text-sm text-muted-foreground">
        Trang bạn tìm kiếm không tồn tại hoặc đã bị di chuyển.
      </p>
      <Button render={<Link href="/" />}>Về trang chủ</Button>
    </div>
  );
}