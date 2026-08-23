"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PptxViewer({
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
        const { init } = await import("pptx-preview");
        if (cancelled) return;
        container.replaceChildren();
        const width = Math.max(320, container.clientWidth);
        const previewer = init(container, { width });
        previewer.preview(buffer);
        if (!cancelled) setState("ready");
      } catch (error) {
        console.error("[pptx-viewer] Không render được tệp:", error);
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
            Đang tải bài trình chiếu…
          </div>
        )}
        {state === "error" && (
          <div className="flex h-40 flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
            <AlertCircle aria-hidden="true" className="size-5" />
            Không hiển thị được bài trình chiếu.
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
          className={state === "ready" ? "pptx-container" : "hidden"}
          aria-label="Nội dung bài trình chiếu"
        />
      </div>
      {state === "ready" && (
        <div className="flex items-center justify-between gap-2 border-t border-border px-3 py-2">
          <p className="text-xs text-muted-foreground">
            Xem trước .pptx trên trình duyệt — bố cục có thể khác bản gốc.
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
