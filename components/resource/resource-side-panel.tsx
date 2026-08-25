"use client";

import { useState } from "react";
import { Info, X } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Bảng chi tiết bên phải trang xem tài liệu.
 * - Desktop (lg+): hiện mặc định, đóng/mở theo lựa chọn của người dùng.
 * - Mobile: ẩn mặc định để tập trung vào nội dung, mở qua nút ⓘ.
 */
export function ResourceSidePanel({ children }: { children: React.ReactNode }) {
  // null = theo mặc định của từng kích thước màn hình
  const [pref, setPref] = useState<boolean | null>(null);
  const showDesktop = pref !== false;
  const showMobile = pref === true;

  return (
    <>
      <aside
        aria-label="Chi tiết tài liệu"
        className={`w-full shrink-0 overflow-y-auto rounded-2xl border border-border/70 bg-card/60 backdrop-blur lg:sticky lg:top-16 lg:max-h-[calc(100vh-5rem)] lg:w-80 ${
          showMobile ? "" : "hidden"
        } ${showDesktop ? "lg:block" : "lg:hidden"}`}
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
            <X aria-hidden="true" />
          </Button>
        </div>
        <div className="space-y-5 p-4">{children}</div>
      </aside>

      {!showMobile && (
        <button
          type="button"
          aria-label="Mở bảng chi tiết"
          onClick={() => setPref(true)}
          className="fixed bottom-6 right-6 z-40 flex size-11 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 lg:hidden"
        >
          <Info className="size-5" aria-hidden="true" />
        </button>
      )}

      {!showDesktop && (
        <button
          type="button"
          aria-label="Mở bảng chi tiết"
          onClick={() => setPref(true)}
          className="fixed bottom-6 right-6 z-40 hidden size-11 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 lg:flex"
        >
          <Info className="size-5" aria-hidden="true" />
        </button>
      )}
    </>
  );
}
