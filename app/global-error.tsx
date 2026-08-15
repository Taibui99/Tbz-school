"use client";

import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <html lang="vi">
      <body className="flex min-h-screen items-center justify-center bg-background px-4 text-foreground">
        <div className="flex max-w-md flex-col items-center gap-4 text-center">
          <h2 className="text-2xl font-semibold tracking-tight">
            Ứng dụng gặp sự cố nghiêm trọng
          </h2>
          <p className="text-sm text-muted-foreground">
            {error.message || "Lỗi không xác định."} Vui lòng thử lại sau.
          </p>
          <Button onClick={retry}>Thử lại</Button>
        </div>
      </body>
    </html>
  );
}