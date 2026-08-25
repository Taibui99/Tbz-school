"use client";

import { Download, Maximize, Minimize } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

export function PdfViewer({
  src,
  resourceId: _resourceId,
  downloadUrl,
}: {
  src: string;
  resourceId: string;
  downloadUrl?: string | null;
  onPageChange?: (page: number) => void;
}) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const toggleFullscreen = useCallback(async () => {
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      await el.requestFullscreen().catch(() => undefined);
    } else {
      await document.exitFullscreen().catch(() => undefined);
    }
  }, []);

  useEffect(() => {
    const onFs = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  return (
    <div
      ref={containerRef}
      className={`overflow-hidden rounded-xl border border-border bg-card ${isFullscreen ? "h-full" : ""}`}
    >
      <div className="flex items-center gap-1.5 border-b border-border bg-muted/40 px-2 py-1.5">
        <div className="ml-auto flex items-center gap-1">
          {downloadUrl && (
            <Button
              variant="ghost"
              size="icon-sm"
              render={<a href={downloadUrl} download aria-label="Tải PDF về" />}
            >
              <Download aria-hidden="true" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={isFullscreen ? "Thoát toàn màn hình" : "Toàn màn hình"}
            onClick={() => void toggleFullscreen()}
          >
            {isFullscreen ? (
              <Minimize aria-hidden="true" />
            ) : (
              <Maximize aria-hidden="true" />
            )}
          </Button>
        </div>
      </div>
      <iframe
        src={src}
        title="PDF Viewer"
        className="w-full border-0"
        style={{ height: isFullscreen ? "calc(100vh - 40px)" : "75vh" }}
      />
    </div>
  );
}
