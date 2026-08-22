"use client";

import { useEffect } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ErrorPage({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-5 px-4 py-24 text-center">
      <span className="flex size-16 items-center justify-center rounded-3xl bg-destructive/10 text-destructive">
        <RefreshCw className="size-8" aria-hidden="true" />
      </span>
      <h2 className="font-heading text-2xl font-bold tracking-tight">
        Đã xảy ra lỗi không mong muốn
      </h2>
      <p className="max-w-md text-sm text-muted-foreground">
        Trang này vừa gặp sự cố. Bạn có thể thử lại; nếu lỗi vẫn tiếp diễn, vui
        lòng thử lại sau.
      </p>
      <Button size="lg" onClick={retry}>
        Thử lại
      </Button>
    </div>
  );
}
