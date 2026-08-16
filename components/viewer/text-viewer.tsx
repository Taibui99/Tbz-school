"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const MAX_PREVIEW_BYTES = 512 * 1024;

export function TextViewer({
  src,
  downloadUrl,
}: {
  src: string;
  downloadUrl?: string | null;
}) {
  const [content, setContent] = useState<string | null>(null);
  const [truncated, setTruncated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch(src);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const blob = await response.blob();
        if (blob.size > MAX_PREVIEW_BYTES) setTruncated(true);
        const text = await blob.slice(0, MAX_PREVIEW_BYTES).text();
        if (!cancelled) setContent(text);
      } catch {
        if (!cancelled) setError("Không đọc được nội dung tệp.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [src]);

  if (error) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-xl border border-border bg-card py-12 text-sm text-destructive">
        <AlertCircle aria-hidden="true" className="size-4" />
        {error}
      </div>
    );
  }

  if (content === null) {
    return (
      <div className="flex h-32 items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        Đang tải nội dung…
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <pre className="max-h-[65vh] overflow-auto whitespace-pre-wrap break-words px-4 py-3 font-mono text-xs leading-relaxed">
        {content || "Tệp trống."}
      </pre>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-3 py-2">
        <p className="text-xs text-muted-foreground">
          {truncated
            ? "Đang hiển thị 512 KB đầu tiên của tệp."
            : "Xem trước nội dung văn bản."}
        </p>
        {downloadUrl && (
          <Button
            variant="outline"
            size="sm"
            render={<a href={downloadUrl} download />}
          >
            <Download aria-hidden="true" />
            Tải tệp
          </Button>
        )}
      </div>
    </div>
  );
}