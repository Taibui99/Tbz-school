"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as pdfjs from "pdfjs-dist";
import type {
  PDFDocumentProxy,
  PDFPageProxy,
  RenderTask,
} from "pdfjs-dist";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Loader2,
  Maximize,
  Minimize,
  Search,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const STORAGE_PREFIX = "tbz:pdf";
const OVERSCAN = 1;

function ensureWorkerConfigured() {
  if (
    typeof window === "undefined" ||
    pdfjs.GlobalWorkerOptions.workerSrc
  ) {
    return;
  }
  try {
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/build/pdf.worker.min.mjs",
      import.meta.url,
    ).href;
  } catch {
    // pdf.js will fall back to main thread (slower but functional)
  }
}

type CanvasCacheEntry =
  | { canvas: HTMLCanvasElement; scale: number; pending?: RenderTask }
  | undefined;

export function PdfViewer({
  src,
  resourceId,
  downloadUrl,
  onPageChange,
}: {
  src: string;
  resourceId: string;
  downloadUrl?: string | null;
  onPageChange?: (page: number) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRefs = useRef(new Map<number, HTMLCanvasElement>());
  const canvasCache = useRef(new Map<number, NonNullable<CanvasCacheEntry>>());
  const pageObjects = useRef(new Map<number, PDFPageProxy>());
  const textCache = useRef(new Map<number, string>());
  const raf = useRef<number | null>(null);

  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pageSize, setPageSize] = useState<{ w: number; h: number } | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(600);
  const [zoom, setZoom] = useState(1);
  const [scrollTop, setScrollTop] = useState(0);
  const [search, setSearch] = useState("");
  const [matches, setMatches] = useState<number[]>([]);
  const [matchIndex, setMatchIndex] = useState(-1);
  const [searching, setSearching] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const restoredScroll = useRef(false);

  // Load document
  useEffect(() => {
    let cancelled = false;
    ensureWorkerConfigured();
    const task = pdfjs.getDocument({ url: src });
    task.promise
      .then((loaded) => {
        if (cancelled) return;
        setDoc(loaded);
        loaded
          .getPage(1)
          .then((page) => {
            const vp = page.getViewport({ scale: 1 });
            setPageSize({ w: vp.width, h: vp.height });
          })
          .catch(() => undefined);
      })
      .catch(() => {
        if (!cancelled) setError("Không đọc được tệp PDF.");
      });
    return () => {
      cancelled = true;
      void task.destroy();
    };
  }, [src]);

  // Measure container
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setViewportHeight(el.clientHeight);
    update();
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
        setViewportHeight(entry.contentRect.height);
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const pageHeight = useMemo(() => {
    if (!pageSize || containerWidth <= 0) return 0;
    return Math.floor((containerWidth * zoom * pageSize.h) / pageSize.w);
  }, [pageSize, containerWidth, zoom]);

  // Restore last page
  useEffect(() => {
    if (restoredScroll.current) return;
    let saved = 0;
    try {
      saved = Number(window.localStorage.getItem(`${STORAGE_PREFIX}:${resourceId}`)) || 0;
    } catch {
      /* ignore */
    }
    if (saved > 0 && pageHeight > 0) {
      containerRef.current?.scrollTo({ top: Math.max(0, saved - 1) * pageHeight });
    }
    restoredScroll.current = true;
  }, [pageHeight, resourceId]);

  // Scroll throttle
  const handleScroll = useCallback(() => {
    if (raf.current !== null) return;
    raf.current = requestAnimationFrame(() => {
      raf.current = null;
      const el = containerRef.current;
      if (el) setScrollTop(el.scrollTop);
    });
  }, []);

  const numPages = doc?.numPages ?? 0;

  const visibleRange = useMemo(() => {
    if (pageHeight <= 0 || numPages === 0) return { start: -1, end: -1 };
    const start = Math.max(0, Math.floor(scrollTop / pageHeight) - OVERSCAN);
    const end = Math.min(
      numPages - 1,
      Math.ceil((scrollTop + viewportHeight) / pageHeight) + OVERSCAN,
    );
    return { start, end };
  }, [scrollTop, pageHeight, viewportHeight, numPages]);

  const currentPage = useMemo(() => {
    if (pageHeight <= 0) return 1;
    return Math.min(numPages, Math.floor(scrollTop / pageHeight) + 1);
  }, [scrollTop, pageHeight, numPages]);

  // Persist current page
  useEffect(() => {
    if (pageHeight <= 0 || numPages === 0) return;
    onPageChange?.(currentPage);
    const timer = setTimeout(() => {
      try {
        window.localStorage.setItem(
          `${STORAGE_PREFIX}:${resourceId}`,
          String(currentPage),
        );
      } catch {
        /* ignore */
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [currentPage, pageHeight, numPages, resourceId, onPageChange]);

  const renderPage = useCallback(
    async (index: number, scale: number) => {
      if (!doc) return;
      const pageNum = index + 1;
      const canvasEl = canvasRefs.current.get(pageNum);
      if (!canvasEl) return;
      const cached = canvasCache.current.get(pageNum);
      if (cached && cached.canvas === canvasEl && cached.scale === scale) return;
      if (cached?.pending) cached.pending.cancel();

      let page = pageObjects.current.get(pageNum);
      if (!page) {
        try {
          page = await doc.getPage(pageNum);
          pageObjects.current.set(pageNum, page);
        } catch {
          return;
        }
      }
      const viewport = page.getViewport({ scale });
      const w = Math.floor(viewport.width);
      const h = Math.floor(viewport.height);
      canvasEl.style.width = `${w}px`;
      canvasEl.style.height = `${h}px`;
      const task = page.render({ canvas: canvasEl, viewport });
      canvasCache.current.set(pageNum, { canvas: canvasEl, scale, pending: task });
      try {
        await task.promise;
        const cur = canvasCache.current.get(pageNum);
        if (cur && cur.canvas === canvasEl) {
          canvasCache.current.set(pageNum, { canvas: canvasEl, scale });
        }
      } catch (renderErr) {
        if ((renderErr as { name?: string })?.name === "RenderingCancelledException") {
          return;
        }
        canvasCache.current.delete(pageNum);
      }
    },
    [doc],
  );

  // Render visible pages
  useEffect(() => {
    if (!doc || pageHeight <= 0 || containerWidth <= 0 || !pageSize) return;
    const { start, end } = visibleRange;
    if (start < 0) return;
    const scale = (containerWidth * zoom) / pageSize.w;
    for (let i = start; i <= end; i++) {
      void renderPage(i, scale);
    }
  }, [doc, visibleRange, zoom, containerWidth, pageSize, pageHeight, renderPage]);

  const scrollToPage = useCallback(
    (pageNum: number) => {
      if (pageHeight <= 0) return;
      containerRef.current?.scrollTo({
        top: Math.max(0, pageNum - 1) * pageHeight,
        behavior: "smooth",
      });
    },
    [pageHeight],
  );

  const runSearch = useCallback(async () => {
    const q = search.trim().toLowerCase();
    if (!doc || q.length === 0) {
      setMatches([]);
      setMatchIndex(-1);
      return;
    }
    setSearching(true);
    const found: number[] = [];
    try {
      for (let i = 1; i <= doc.numPages; i++) {
        let text = textCache.current.get(i);
        if (text === undefined) {
          let page = pageObjects.current.get(i);
          if (!page) {
            try {
              page = await doc.getPage(i);
              pageObjects.current.set(i, page);
            } catch {
              continue;
            }
          }
          const content = await page.getTextContent();
          text = content.items
            .map((item) => ("str" in item ? item.str : ""))
            .join(" ");
          textCache.current.set(i, text);
        }
        if (text.toLowerCase().includes(q)) found.push(i);
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    } finally {
      setSearching(false);
    }
    setMatches(found);
    setMatchIndex(found.length > 0 ? 0 : -1);
    if (found.length > 0) scrollToPage(found[0]);
  }, [doc, search, scrollToPage]);

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

  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card py-12 text-center">
        <p className="text-sm text-destructive">{error}</p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setError(null);
            setDoc(null);
            // Force remount by updating key
            window.location.reload();
          }}
        >
          Thử lại
        </Button>
      </div>
    );
  }

  if (!doc || !pageSize || containerWidth <= 0) {
    return (
      <div className="flex h-40 items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        Đang mở tài liệu…
      </div>
    );
  }

  const { start, end } = visibleRange;
  const totalHeight = numPages * pageHeight;
  const zoomPercent = Math.round(zoom * 100);

  return (
    <div
      className={`overflow-hidden rounded-xl border border-border bg-card ${isFullscreen ? "h-full" : ""}`}
    >
      <div className="flex flex-wrap items-center gap-1.5 border-b border-border bg-muted/40 px-2 py-1.5">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Trang trước"
          disabled={currentPage <= 1}
          onClick={() => scrollToPage(currentPage - 1)}
        >
          <ChevronLeft aria-hidden="true" />
        </Button>
        <span className="flex items-center gap-1 text-xs tabular-nums text-muted-foreground">
          <Input
            type="number"
            min={1}
            max={numPages}
            value={currentPage}
            onChange={(e) => {
              const value = Math.min(
                numPages,
                Math.max(1, Number(e.target.value) || 1),
              );
              scrollToPage(value);
            }}
            aria-label="Trang hiện tại"
            className="h-7 w-14 px-1 text-center text-xs"
          />
          / {numPages}
        </span>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Trang sau"
          disabled={currentPage >= numPages}
          onClick={() => scrollToPage(currentPage + 1)}
        >
          <ChevronRight aria-hidden="true" />
        </Button>

        <span className="mx-1 h-4 w-px bg-border" aria-hidden="true" />

        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Thu nhỏ"
          disabled={zoom <= 0.5}
          onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.25).toFixed(2)))}
        >
          <ZoomOut aria-hidden="true" />
        </Button>
        <button
          type="button"
          className="min-w-10 rounded-md px-1.5 py-0.5 text-xs tabular-nums hover:bg-muted"
          onClick={() => setZoom(1)}
          title="Vừa với chiều rộng"
        >
          {zoomPercent}%
        </button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Phóng to"
          disabled={zoom >= 4}
          onClick={() => setZoom((z) => Math.min(4, +(z + 0.25).toFixed(2)))}
        >
          <ZoomIn aria-hidden="true" />
        </Button>

        <span className="mx-1 h-4 w-px bg-border" aria-hidden="true" />

        <form
          className="flex items-center gap-1"
          onSubmit={(e) => {
            e.preventDefault();
            void runSearch();
          }}
        >
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm trong PDF…"
            aria-label="Tìm trong PDF"
            className="h-7 w-40 text-xs"
          />
          <Button variant="ghost" size="icon-sm" type="submit" aria-label="Tìm kiếm">
            {searching ? (
              <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <Search aria-hidden="true" />
            )}
          </Button>
          {matches.length > 0 && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label="Kết quả trước"
                disabled={matchIndex <= 0}
                onClick={() => {
                  const next = Math.max(0, matchIndex - 1);
                  setMatchIndex(next);
                  scrollToPage(matches[next]);
                }}
              >
                <ChevronLeft aria-hidden="true" />
              </Button>
              {matchIndex + 1}/{matches.length}
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label="Kết quả sau"
                disabled={matchIndex >= matches.length - 1}
                onClick={() => {
                  const next = Math.min(matches.length - 1, matchIndex + 1);
                  setMatchIndex(next);
                  scrollToPage(matches[next]);
                }}
              >
                <ChevronRight aria-hidden="true" />
              </Button>
            </span>
          )}
          {!searching && matches.length === 0 && search.trim() !== "" && (
            <span className="text-xs text-muted-foreground">Không tìm thấy</span>
          )}
        </form>

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

      <div
        ref={containerRef}
        onScroll={handleScroll}
        className={isFullscreen ? "h-full" : "h-[75vh]"}
        style={{ position: "relative", overflow: "auto" }}
      >
        <div style={{ position: "relative", height: totalHeight }}>
          {start >= 0 &&
            end >= start &&
            Array.from({ length: end - start + 1 }, (_, k) => {
              const index = start + k;
              const pageNum = index + 1;
              return (
                <div
                  key={pageNum}
                  style={{
                    position: "absolute",
                    top: index * pageHeight,
                    left: 0,
                    right: 0,
                    height: pageHeight,
                    display: "flex",
                    justifyContent: "center",
                  }}
                >
                  <canvas
                    ref={(el) => {
                      if (el) canvasRefs.current.set(pageNum, el);
                      else canvasRefs.current.delete(pageNum);
                    }}
                    className="shadow-sm"
                  />
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}