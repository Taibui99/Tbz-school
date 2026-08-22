"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { NotebookPen, Pencil, Trash2 } from "lucide-react";
import {
  createAnnotationAction,
  deleteAnnotationAction,
  getAnnotationsAction,
  updateAnnotationAction,
  type AnnotationActionResult,
  type AnnotationRow,
} from "@/lib/resource/annotation-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const TYPE_META: Record<
  string,
  { label: string; icon: typeof NotebookPen }
> = {
  note: { label: "Ghi chú", icon: NotebookPen },
  sticky: { label: "Ghi chú dính", icon: NotebookPen },
  bookmark: { label: "Đánh dấu trang", icon: NotebookPen },
  text: { label: "Ghi chú văn bản", icon: NotebookPen },
};

function formatTime(seconds: number | null): string {
  if (seconds == null) return "";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function AnnotationSection({
  resourceId,
  viewerKind,
  currentPage,
  currentTime,
}: {
  resourceId: string;
  viewerKind: string;
  currentPage: number | null;
  currentTime: number | null;
}) {
  const [items, setItems] = useState<AnnotationRow[]>([]);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [result, setResult] = useState<AnnotationActionResult | null>(null);
  const [isPending, startTransition] = useTransition();

  const load = useCallback(() => {
    getAnnotationsAction(resourceId)
      .then((rows) => setItems(rows))
      .catch(() => {});
  }, [resourceId]);

  useEffect(() => {
    load();
  }, [load]);

  function runCreate(formData: FormData) {
    startTransition(async () => {
      const res = await createAnnotationAction({}, formData);
      setResult(res);
      if (res.success) {
        load();
        setAdding(false);
      }
    });
  }

  function runUpdate(formData: FormData) {
    startTransition(async () => {
      const res = await updateAnnotationAction({}, formData);
      setResult(res);
      if (res.success) {
        load();
        setEditingId(null);
      }
    });
  }

  function runDelete(formData: FormData) {
    startTransition(async () => {
      const res = await deleteAnnotationAction({}, formData);
      setResult(res);
      if (res.success) load();
    });
  }

  const locationLabel =
    viewerKind === "pdf" && currentPage != null
      ? `Trang ${currentPage}`
      : viewerKind === "video" && currentTime != null
        ? formatTime(currentTime)
        : "Tài liệu";

  return (
    <section className="mt-6">
      <h2 className="mb-2 text-sm font-medium">Ghi chú & đánh dấu</h2>
      <div className="glass-panel rounded-2xl p-4">
        {!adding && (
          <Button type="button" size="sm" onClick={() => setAdding(true)}>
            <NotebookPen aria-hidden="true" />
            Thêm ghi chú
          </Button>
        )}

        {adding && (
          <form action={runCreate} className="flex flex-col gap-3">
            <input type="hidden" name="resourceId" value={resourceId} />
            {viewerKind === "pdf" && (
              <input
                type="hidden"
                name="page"
                value={currentPage == null ? "" : String(currentPage)}
              />
            )}
            {viewerKind === "video" && (
              <input
                type="hidden"
                name="timePosition"
                value={currentTime == null ? "" : String(currentTime)}
              />
            )}
            <p className="text-xs text-muted-foreground">
              Vị trí: {locationLabel}
            </p>
            <div className="flex items-center gap-2">
              <select
                name="type"
                defaultValue="note"
                className="h-9 rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <option value="note">Ghi chú</option>
                <option value="sticky">Ghi chú dính</option>
                <option value="bookmark">Đánh dấu trang</option>
              </select>
              <Input
                name="content"
                placeholder="Nội dung (để trống nếu chỉ đánh dấu vị trí)…"
                className="h-9"
                maxLength={2000}
              />
              <Button
                type="submit"
                size="sm"
                disabled={isPending}
              >
                Lưu
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setAdding(false)}
              >
                Hủy
              </Button>
            </div>
          </form>
        )}

        {result?.error && (
          <Alert variant="destructive" className="mt-3">
            <AlertTitle>Lỗi</AlertTitle>
            <AlertDescription>{result.error}</AlertDescription>
          </Alert>
        )}
        {result?.success && (
          <Alert className="mt-3">
            <AlertTitle>Đã lưu</AlertTitle>
            <AlertDescription>{result.success}</AlertDescription>
          </Alert>
        )}

        {items.length === 0 && !adding ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Chưa có ghi chú nào cho tài liệu này.
          </p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {items.map((item) => {
              const meta = TYPE_META[item.annotation_type] ?? TYPE_META.note;
              const Icon = meta.icon;
              const editing = editingId === item.id;
              return (
                <li
                  key={item.id}
                  className="rounded-lg border border-border px-3 py-2"
                >
                  <div className="flex items-center gap-2 text-sm">
                    <Icon
                      aria-hidden="true"
                      className="size-4 text-muted-foreground"
                    />
                    <span className="font-medium">{meta.label}</span>
                    <span className="text-xs text-muted-foreground">
                      {item.page != null
                        ? `Trang ${item.page}`
                        : item.time_position != null
                          ? formatTime(item.time_position)
                          : "Tài liệu"}
                    </span>
                    <span className="ml-auto flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Sửa ghi chú"
                        onClick={() =>
                          setEditingId(editing ? null : item.id)
                        }
                      >
                        <Pencil aria-hidden="true" className="size-3.5" />
                      </Button>
                      <form action={runDelete}>
                        <input type="hidden" name="id" value={item.id} />
                        <Button
                          type="submit"
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Xóa ghi chú"
                          disabled={isPending}
                        >
                          <Trash2 aria-hidden="true" className="size-3.5" />
                        </Button>
                      </form>
                    </span>
                  </div>
                  {editing ? (
                    <form
                      action={runUpdate}
                      className="mt-2 flex items-center gap-2"
                    >
                      <input type="hidden" name="id" value={item.id} />
                      <Input
                        name="content"
                        defaultValue={item.content ?? ""}
                        className="h-8 text-sm"
                        maxLength={2000}
                      />
                      <Button type="submit" size="sm" disabled={isPending}>
                        Lưu
                      </Button>
                    </form>
                  ) : (
                    item.content && (
                      <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                        {item.content}
                      </p>
                    )
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}