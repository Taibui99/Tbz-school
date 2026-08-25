"use client";

import {
  Download,
  FileText,
  Maximize,
  Minimize,
  RefreshCw,
} from "lucide-react";
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
  const [showFallback, setShowFallback] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

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

  const fallback = (
    <div className="flex flex-col items-center gap-3 py-12 text-center">
      <FileText aria-hidden="true" className="size-8 text-muted-foreground" />
      <div>
        <p className="font-medium">Tệp này có thể không xem trước được</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Vui lòng tải về máy để mở bằng trình đọc PDF.
        </p>
      </div>
      {downloadUrl && (
        <a
          href={downloadUrl}
          download
          className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/80"
        >
          <Download aria-hidden="true" className="size-4" />
          Tải về
        </a>
      )}
    </div>
  );

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
      {showFallback ? (
        fallback
      ) : (
        <>
          <iframe
            ref={iframeRef}
            src={src}
            title="PDF Viewer"
            className="w-full border-0"
            style={{ height: isFullscreen ? "calc(100vh - 40px)" : "75vh" }}
          />
          <div className="flex items-center justify-center gap-3 border-t border-border bg-muted/40 px-3 py-1.5">
            <span className="text-xs text-muted-foreground">
              Không xem được?
            </span>
            {downloadUrl && (
              <a
                href={downloadUrl}
                download
                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                <Download className="size-3" />
                Tải về
              </a>
            )}
            <button
              type="button"
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setShowFallback(true)}
            >
              <RefreshCw className="size-3" />
              Xem bản fallback
            </button>
          </div>
        </>
      )}
    </div>
  );
}
