"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BookOpen, PlayCircle } from "lucide-react";
import { TypeIcon } from "@/components/resource/type-icon";
import {
  getContinueContextAction,
  type ContinueContext,
} from "@/lib/resource/dashboard-actions";

interface ContinueEntry {
  resourceId: string;
  kind: "pdf" | "video";
  value: number;
}

function readLocalEntries(): ContinueEntry[] {
  const entries: ContinueEntry[] = [];
  try {
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);
      if (!key) continue;
      const match = /^tbz:(pdf|video):(.+)$/.exec(key);
      if (!match) continue;
      const raw = window.localStorage.getItem(key);
      const value = Number.parseFloat(raw ?? "");
      if (!Number.isFinite(value)) continue;
      const kind = match[1] as "pdf" | "video";
      const resourceId = match[2];
      const minValue = kind === "pdf" ? 2 : 10;
      if (value < minValue) continue;
      entries.push({ resourceId, kind, value });
    }
  } catch {
    /* localStorage unavailable */
  }
  return entries;
}

export function ContinueViewing() {
  const [items, setItems] = useState<
    (ContinueEntry & { context?: ContinueContext })[]
  >([]);

  useEffect(() => {
    const entries = readLocalEntries();
    if (entries.length === 0) return;
    getContinueContextAction(entries.map((e) => e.resourceId))
      .then((contexts) => {
        const byId = new Map(contexts.map((c) => [c.id, c]));
        setItems(
          entries
            .filter((e) => byId.has(e.resourceId))
            .map((e) => ({ ...e, context: byId.get(e.resourceId) })),
        );
      })
      .catch(() => {});
  }, []);

  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Chưa có tiến trình xem. Mở một tài liệu PDF hoặc video để tiếp tục ở
        lần sau.
      </p>
    );
  }

  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((entry) => {
        const context = entry.context!;
        const href = context.workspaceId
          ? `/kho/${context.workspaceId}/${context.collectionId}/${context.lessonId}/${context.id}`
          : "#";
        const progress =
          entry.kind === "pdf"
            ? `Trang ${entry.value}`
            : `Phút ${Math.max(1, Math.round(entry.value / 60))}`;
        return (
          <li key={`${entry.kind}-${entry.resourceId}`}>
            <Link
              href={href}
              className="flex items-center gap-3 glass-panel rounded-2xl px-4 py-3 transition-colors hover:border-primary/40"
            >
              {entry.kind === "pdf" ? (
                <BookOpen aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
              ) : (
                <PlayCircle aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
              )}
              <TypeIcon type={context.type} className="size-4 shrink-0" />
              <span className="min-w-0 flex-1 truncate text-sm font-medium">
                {context.title}
              </span>
              <span className="shrink-0 text-xs text-muted-foreground">
                {progress}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}