"use client";

import { useCallback, useEffect, useState } from "react";
import { HardDrive } from "lucide-react";
import { getUserQuotaUsage } from "@/lib/upload/actions";

type QuotaData = {
  usedBytes: number;
  quotaBytes: number;
  usedLabel: string;
  quotaLabel: string;
  percent: number;
};

export function QuotaBar() {
  const [data, setData] = useState<QuotaData | null>(null);

  const fetchQuota = useCallback(() => {
    getUserQuotaUsage().then(setData);
  }, []);

  useEffect(() => {
    fetchQuota();
    const onStorage = () => fetchQuota();
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [fetchQuota]);

  if (!data || data.usedBytes === 0) return null;

  const color =
    data.percent >= 90
      ? "bg-destructive"
      : data.percent >= 70
        ? "bg-amber-500"
        : "bg-primary";

  return (
    <div
      className="flex items-center gap-2 rounded-full border border-border/50 bg-background/60 px-3 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur-sm"
      title={`Dung lượng: ${data.usedLabel} / ${data.quotaLabel}${data.percent >= 80 ? " — Sắp đầy!" : ""}`}
    >
      <HardDrive className="size-3.5 shrink-0" aria-hidden="true" />
      <span className="hidden sm:inline">{data.usedLabel}</span>
      <span className="hidden sm:inline text-muted-foreground/60">/</span>
      <span className="hidden sm:inline">{data.quotaLabel}</span>
      <div className="h-1.5 w-14 overflow-hidden rounded-full bg-muted sm:w-20">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${data.percent}%` }}
        />
      </div>
    </div>
  );
}
