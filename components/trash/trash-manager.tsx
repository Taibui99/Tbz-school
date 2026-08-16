"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArchiveRestore, RotateCcw, Trash2 } from "lucide-react";
import {
  emptyTrashAction,
  permanentDeleteResourceAction,
} from "@/lib/resource/trash-actions";
import { restoreResourceAction } from "@/lib/resource/actions";
import { TypeIcon } from "@/components/resource/type-icon";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export type TrashItem = {
  id: string;
  title: string;
  type: string;
  deleted_at: string | null;
  size_bytes: number | null;
};

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatBytes(bytes: number | null): string {
  if (bytes === null) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function TrashManager({
  items,
  canEmpty,
}: {
  items: TrashItem[];
  canEmpty: boolean;
}) {
  const router = useRouter();
  const [result, setResult] = useState<{ success?: string; error?: string } | null>(
    null,
  );
  const [isPending, startTransition] = useTransition();

  function run(formData: FormData, confirmMessage?: string) {
    if (confirmMessage && !window.confirm(confirmMessage)) return;
    startTransition(async () => {
      const id = formData.get("id");
      if (id) {
        const res = await permanentDeleteResourceAction(formData);
        setResult(res);
      } else {
        const res = await emptyTrashAction({}, formData);
        setResult(res);
      }
      router.refresh();
    });
  }

  function runRestore(formData: FormData) {
    startTransition(async () => {
      const res = await restoreResourceAction(formData);
      setResult(res);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {result?.error && (
        <Alert variant="destructive">
          <AlertTitle>Lỗi</AlertTitle>
          <AlertDescription>{result.error}</AlertDescription>
        </Alert>
      )}
      {result?.success && (
        <Alert>
          <AlertTitle>Đã xử lý</AlertTitle>
          <AlertDescription>{result.success}</AlertDescription>
        </Alert>
      )}

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-16 text-center">
          <p className="font-medium">Thùng rác trống</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Tài liệu bạn xóa sẽ nằm ở đây và có thể khôi phục.
          </p>
        </div>
      ) : (
        <>
          <ul className="flex flex-col gap-2">
            {items.map((item) => (
              <li
                key={item.id}
                className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card px-4 py-2.5"
              >
                <TypeIcon type={item.type} className="size-4 shrink-0" />
                <span className="min-w-0 flex-1 truncate text-sm font-medium">
                  {item.title}
                </span>
                <span className="hidden shrink-0 text-xs text-muted-foreground sm:inline">
                  {formatBytes(item.size_bytes)}
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  Xóa lúc {formatDate(item.deleted_at)}
                </span>
                <span className="flex shrink-0 items-center gap-1">
                  <form action={runRestore}>
                    <input type="hidden" name="id" value={item.id} />
                    <Button
                      type="submit"
                      variant="outline"
                      size="sm"
                      disabled={isPending}
                    >
                      <RotateCcw aria-hidden="true" />
                      Khôi phục
                    </Button>
                  </form>
                  <form
                    action={(formData) =>
                      run(formData, "Xóa vĩnh viễn tài liệu này? Không thể hoàn tác.")
                    }
                  >
                    <input type="hidden" name="id" value={item.id} />
                    <Button
                      type="submit"
                      variant="ghost"
                      size="sm"
                      disabled={isPending}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 aria-hidden="true" />
                      Xóa vĩnh viễn
                    </Button>
                  </form>
                </span>
              </li>
            ))}
          </ul>

          {canEmpty && (
            <form
              action={(formData) =>
                run(
                  formData,
                  "Xóa vĩnh viễn tất cả tài liệu trong thùng rác? Không thể hoàn tác.",
                )
              }
            >
              <Button
                type="submit"
                variant="destructive"
                size="sm"
                disabled={isPending}
              >
                <ArchiveRestore aria-hidden="true" />
                Dọn thùng rác
              </Button>
            </form>
          )}
        </>
      )}
    </div>
  );
}