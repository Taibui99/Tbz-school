"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, Info, X, XCircle } from "lucide-react";

type ToastVariant = "success" | "error" | "info";

type ToastItem = {
  id: number;
  title: string;
  description?: string;
  variant: ToastVariant;
};

type PushToast = (toast: {
  title: string;
  description?: string;
  variant?: ToastVariant;
}) => void;

const ToastContext = createContext<PushToast>(() => {});

export function useToast() {
  return useContext(ToastContext);
}

const VARIANT_STYLES: Record<ToastVariant, { icon: ReactNode; ring: string }> =
  {
    success: {
      icon: <CheckCircle2 className="size-5 text-emerald-500" aria-hidden="true" />,
      ring: "ring-emerald-500/25",
    },
    error: {
      icon: <XCircle className="size-5 text-destructive" aria-hidden="true" />,
      ring: "ring-destructive/25",
    },
    info: {
      icon: <Info className="size-5 text-primary" aria-hidden="true" />,
      ring: "ring-primary/20",
    },
  };

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const counter = useRef(0);

  const dismiss = useCallback((id: number) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const push = useCallback<PushToast>(
    ({ title, description, variant = "info" }) => {
      const id = ++counter.current;
      setItems((prev) => [
        ...prev.slice(-4),
        { id, title, description, variant },
      ]);
      window.setTimeout(() => dismiss(id), 4500);
    },
    [dismiss],
  );

  // Portal chỉ tồn tại phía client — nội dung render qua createPortal nên
  // không bị lệch hydration với HTML từ server.
  if (typeof document === "undefined") {
    return <ToastContext.Provider value={push}>{children}</ToastContext.Provider>;
  }

  return (
    <ToastContext.Provider value={push}>
      {children}
      {createPortal(
          <div className="pointer-events-none fixed top-20 right-4 z-[70] flex w-80 flex-col gap-2">
            {items.map((item) => (
              <div
                key={item.id}
                role="status"
                className={`glass-panel pointer-events-auto flex items-start gap-3 rounded-xl px-4 py-3 shadow-[var(--shadow-lift)] ring-1 ${VARIANT_STYLES[item.variant].ring} animate-in fade-in slide-in-from-right-4 duration-300`}
              >
                <span className="mt-0.5 shrink-0">
                  {VARIANT_STYLES[item.variant].icon}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm leading-snug font-medium">
                    {item.title}
                  </p>
                  {item.description ? (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {item.description}
                    </p>
                  ) : null}
                </div>
                <button
                  type="button"
                  aria-label="Đóng thông báo"
                  onClick={() => dismiss(item.id)}
                  className="shrink-0 rounded-md p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <X className="size-4" aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>,
          document.body,
        )}
    </ToastContext.Provider>
  );
}
