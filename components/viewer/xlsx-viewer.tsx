"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const MAX_ROWS = 300;
const MAX_COLS = 40;

interface SheetGrid {
  name: string;
  rows: string[][];
}

function cellText(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value);
}

export function XlsxViewer({
  src,
  downloadUrl,
}: {
  src: string;
  downloadUrl?: string | null;
}) {
  const [sheets, setSheets] = useState<SheetGrid[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch(src);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const buffer = await response.arrayBuffer();
        if (cancelled) return;
        const XLSX = await import("xlsx");
        if (cancelled) return;
        const workbook = XLSX.read(buffer, { type: "array" });
        const grids: SheetGrid[] = workbook.SheetNames.map((name) => {
          const sheet = workbook.Sheets[name];
          const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
            header: 1,
            blankrows: false,
            defval: "",
          });
          return {
            name,
            rows: matrix
              .slice(0, MAX_ROWS)
              .map((row) =>
                row.slice(0, MAX_COLS).map((cell) => cellText(cell)),
              ),
          };
        });
        if (!cancelled) {
          setSheets(grids);
          setActiveIndex(0);
          setState("ready");
        }
      } catch (error) {
        console.error("[xlsx-viewer] Không đọc được tệp:", error);
        if (!cancelled) setState("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [src]);

  const active = sheets[activeIndex];

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="max-h-[70vh] overflow-auto">
        {state === "loading" && (
          <div className="flex h-40 items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            Đang tải bảng tính…
          </div>
        )}
        {state === "error" && (
          <div className="flex h-40 flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
            <AlertCircle aria-hidden="true" className="size-5" />
            Không hiển thị được bảng tính.
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
        {state === "ready" && active && (
          <table className="w-full border-collapse text-xs">
            <tbody>
              {active.rows.map((row, rowIndex) => (
                <tr key={rowIndex} className="even:bg-muted/40">
                  {row.map((cell, colIndex) => (
                    <td
                      key={colIndex}
                      className="max-w-[16rem] truncate border border-border px-2 py-1"
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
              {active.rows.length === 0 && (
                <tr>
                  <td className="px-3 py-6 text-center text-muted-foreground">
                    Trang tính trống.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
      {state === "ready" && sheets.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-3 py-2">
          <div className="flex flex-wrap gap-1">
            {sheets.map((sheet, index) => (
              <button
                key={sheet.name}
                type="button"
                onClick={() => setActiveIndex(index)}
                aria-pressed={index === activeIndex}
                className={`rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                  index === activeIndex
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/70"
                }`}
              >
                {sheet.name}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              Hiển thị tối đa {MAX_ROWS} hàng × {MAX_COLS} cột mỗi trang tính.
            </span>
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
      )}
    </div>
  );
}
