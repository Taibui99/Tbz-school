"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Archive, Check, RotateCcw, UploadCloud } from "lucide-react";
import { restoreVersionAction } from "@/lib/resource/version-actions";
import { UploadFileButton } from "@/components/upload/upload-file-button";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export type VersionRow = {
  id: string;
  version: number;
  provider: string | null;
  storage_key: string | null;
  mime: string | null;
  size_bytes: number | null;
  sha256: string | null;
  created_at: string;
};

function formatBytes(bytes: number | null): string {
  if (bytes === null) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function VersionsPanel({
  resourceId,
  files,
  currentKey,
  canUpload,
}: {
  resourceId: string;
  files: VersionRow[];
  currentKey: string | null;
  canUpload: boolean;
}) {
  const router = useRouter();
  const [result, setResult] = useState<{ success?: string; error?: string } | null>(
    null,
  );
  const [isPending, startTransition] = useTransition();

  function runRestore(formData: FormData) {
    startTransition(async () => {
      const res = await restoreVersionAction({}, formData);
      setResult(res);
      if (res.success) router.refresh();
    });
  }

  if (files.length === 0) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">
          Chưa có phiên bản tệp nào.
        </p>
        {canUpload && <UploadFileButton resourceId={resourceId} mode="version" />}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {canUpload && <UploadFileButton resourceId={resourceId} mode="version" />}

      {result?.error && (
        <Alert variant="destructive">
          <AlertTitle>Lỗi</AlertTitle>
          <AlertDescription>{result.error}</AlertDescription>
        </Alert>
      )}
      {result?.success && (
        <Alert>
          <AlertTitle>Đã khôi phục</AlertTitle>
          <AlertDescription>{result.success}</AlertDescription>
        </Alert>
      )}

      <ul className="flex flex-col gap-2">
        {[...files]
          .sort((a, b) => b.version - a.version)
          .map((file) => {
            const current = currentKey != null && file.storage_key === currentKey;
            return (
              <li
                key={file.id}
                className="flex flex-wrap items-center gap-3 rounded-lg border border-border px-3 py-2"
              >
                <Archive
                  aria-hidden="true"
                  className="size-4 shrink-0 text-muted-foreground"
                />
                <span className="text-sm font-medium">Phiên bản {file.version}</span>
                <span className="text-xs text-muted-foreground">
                  {formatBytes(file.size_bytes)} · {formatDate(file.created_at)}
                </span>
                {current && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                    <Check aria-hidden="true" className="size-3" />
                    Hiện tại
                  </span>
                )}
                {!current && canUpload && (
                  <form action={runRestore} className="ml-auto">
                    <input type="hidden" name="resourceId" value={resourceId} />
                    <input type="hidden" name="version" value={String(file.version)} />
                    <Button
                      type="submit"
                      variant="ghost"
                      size="sm"
                      disabled={isPending}
                    >
                      <RotateCcw aria-hidden="true" />
                      Khôi phục
                    </Button>
                  </form>
                )}
              </li>
            );
          })}
      </ul>

      {canUpload && (
        <p className="text-xs text-muted-foreground">
          <UploadCloud aria-hidden="true" className="mr-1 inline size-3" />
          Tải phiên bản mới sẽ thay tệp hiện tại; các phiên bản cũ vẫn được
          giữ trong lịch sử.
        </p>
      )}
    </div>
  );
}