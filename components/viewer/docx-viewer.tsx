"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function DocxViewer({
  src,
  downloadUrl,
}: {
  src: string;
  downloadUrl?: string | null;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    const container = containerRef.current;
    if (!container) return;

    (async () => {
      try {
        const response = await fetch(src);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const buffer = await response.arrayBuffer();
        if (cancelled) return;
        const { renderAsync } = await import("docx-preview");
        if (cancelled) return;
        container.replaceChildren();
        await renderAsync(buffer, container, undefined, {
          inWrapper: true,
          ignoreLastRenderedPageBreak: false,
          experimental: true,
        });
        if (!cancelled) setState("ready");
      } catch (error) {
        console.error("[docx-viewer] Không render được tệp:", error);
        if (!cancelled) setState("error");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [src]);

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="max-h-[70vh] overflow-auto bg-background px-2 py-4">
        {state === "loading" && (
          <div className="flex h-40 items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            Đang tải nội dung Word…
          </div>
        )}
        {state === "error" && (
          <div className="flex h-40 flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
            <AlertCircle aria-hidden="true" className="size-5" />
            Không hiển thị được nội dung Word.
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
        )}
        <div
          ref={containerRef}
          className={state === "ready" ? "" : "hidden"}
          aria-label="Nội dung tài liệu Word"
        />
      </div>
      {state === "ready" && (
        <div className="flex items-center justify-between gap-2 border-t border-border px-3 py-2">
          <p className="text-xs text-muted-foreground">
            Xem trước .docx ngay trên trình duyệt — bố cục có thể khác bản gốc.
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
      )}
    </div>
  );
}
