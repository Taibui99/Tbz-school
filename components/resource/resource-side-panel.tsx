"use client";

import { useState } from "react";
import { PanelRightOpen, PanelRightClose } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Bảng chi tiết bên phải trang xem tài liệu.
 * - Desktop (lg+): hiện mặc định, đóng/mở theo lựa chọn của người dùng.
 * - Mobile: ẩn mặc định, mở qua nút floating.
 */
export function ResourceSidePanel({ children }: { children: React.ReactNode }) {
  const [pref, setPref] = useState<boolean | null>(null);
  const showDesktop = pref !== false;
  const showMobile = pref === true;

  const isOpen = showMobile || showDesktop;

  return (
    <>
      <aside
        aria-label="Chi tiết tài liệu"
        className={`w-full shrink-0 overflow-y-auto rounded-2xl border border-border/70 bg-card/60 backdrop-blur transition-all lg:sticky lg:top-16 lg:max-h-[calc(100vh-5rem)] lg:w-80 ${
          isOpen ? "block" : "hidden"
        }`}
      >
        <div className="flex items-center justify-between border-b border-border/70 px-4 py-2.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Chi tiết
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Đóng bảng chi tiết"
            onClick={() => setPref(false)}
          >
            <PanelRightClose aria-hidden="true" className="size-4" />
          </Button>
        </div>
        <div className="space-y-5 p-4">{children}</div>
      </aside>

      {!isOpen && (
        <button
          type="button"
          aria-label="Mở bảng chi tiết"
          onClick={() => setPref(true)}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full border border-border bg-card/90 px-4 py-2.5 text-sm font-medium text-foreground shadow-lg backdrop-blur-sm transition-all hover:scale-105 hover:shadow-xl"
        >
          <PanelRightOpen className="size-4" aria-hidden="true" />
          <span className="hidden sm:inline">Chi tiết</span>
        </button>
      )}
    </>
  );
}
