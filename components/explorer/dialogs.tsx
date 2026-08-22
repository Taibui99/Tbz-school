"use client";

import { useState } from "react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { TYPE_LABELS, VISIBILITY_LABELS } from "@/components/resource/resource-dialogs";
import { formatBytes } from "@/lib/upload/client-upload";
import type { ExplorerFile, ExplorerWorkspace } from "./types";

const selectClass =
  "h-9 w-full rounded-xl border border-input bg-card/60 px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export type MoveSelection = {
  workspaceId?: string;
  collectionId?: string;
  lessonId?: string;
};

export function ExplorerMoveDialog({
  open,
  mode,
  tree,
  current,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  mode: "file" | "collection" | "lesson";
  tree: ExplorerWorkspace[];
  current: { w?: string; c?: string; l?: string };
  onOpenChange: (open: boolean) => void;
  onConfirm: (selection: MoveSelection) => Promise<void>;
}) {
  const [selW, setSelW] = useState(current.w ?? "");
  const [selC, setSelC] = useState(current.c ?? "");
  const [selL, setSelL] = useState(current.l ?? "");
  const [busy, setBusy] = useState(false);

  // Reset lựa chọn về vị trí hiện tại mỗi lần dialog mở
  // (pattern "adjust state when props change" trong render).
  const [lastOpen, setLastOpen] = useState(open);
  if (open !== lastOpen) {
    setLastOpen(open);
    if (open) {
      setSelW(current.w ?? "");
      setSelC(current.c ?? "");
      setSelL(current.l ?? "");
      setBusy(false);
    }
  }

  const workspace = tree.find((ws) => ws.id === selW);
  const collection = workspace?.collections.find((col) => col.id === selC);
  const canConfirm =
    mode === "collection"
      ? Boolean(selW && selW !== current.w)
      : mode === "lesson"
        ? Boolean(selC && selC !== current.c)
        : Boolean(selW && selC && selL && selL !== current.l);

  async function handleConfirm() {
    setBusy(true);
    try {
      await onConfirm({ workspaceId: selW, collectionId: selC, lessonId: selL });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {mode === "file" ? "Di chuyển tài liệu" : mode === "lesson" ? "Di chuyển bài học" : "Di chuyển bộ sưu tập"}
          </DialogTitle>
          <DialogDescription>Chọn vị trí mới trong kho của bạn.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          {mode !== "collection" ? (
            <>
              <label className="flex flex-col gap-1 text-sm">
                Workspace
                <select
                  value={selW}
                  onChange={(event) => {
                    setSelW(event.target.value);
                    setSelC("");
                    setSelL("");
                  }}
                  className={selectClass}
                >
                  <option value="">— Chọn workspace —</option>
                  {tree.map((ws) => (
                    <option key={ws.id} value={ws.id}>
                      {ws.name || "Không tên"}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm">
                Bộ sưu tập
                <select
                  value={selC}
                  onChange={(event) => {
                    setSelC(event.target.value);
                    setSelL("");
                  }}
                  disabled={!selW}
                  className={selectClass}
                >
                  <option value="">— Chọn bộ sưu tập —</option>
                  {(workspace?.collections ?? [])
                    .filter((col) => col.id !== current.c)
                    .map((col) => (
                      <option key={col.id} value={col.id}>
                        {col.name || "Không tên"}
                      </option>
                    ))}
                </select>
              </label>
              {mode === "file" ? (
                <label className="flex flex-col gap-1 text-sm">
                  Bài học
                  <select
                    value={selL}
                    onChange={(event) => setSelL(event.target.value)}
                    disabled={!selC}
                    className={selectClass}
                  >
                    <option value="">— Chọn bài học —</option>
                    {(collection?.lessons ?? [])
                      .filter((les) => les.id !== current.l)
                      .map((les) => (
                        <option key={les.id} value={les.id}>
                          {les.name || "Không tên"} ({les.files.length} tài liệu)
                        </option>
                      ))}
                  </select>
                </label>
              ) : null}
            </>
          ) : (
            <label className="flex flex-col gap-1 text-sm">
              Workspace đích
              <select
                value={selW}
                onChange={(event) => setSelW(event.target.value)}
                className={selectClass}
              >
                <option value="">— Chọn workspace —</option>
                {tree
                  .filter((ws) => ws.id !== current.w)
                  .map((ws) => (
                    <option key={ws.id} value={ws.id}>
                      {ws.name || "Không tên"}
                    </option>
                  ))}
              </select>
            </label>
          )}
        </div>
        <DialogFooter>
          <DialogClose render={<Button variant="ghost" />}>Hủy</DialogClose>
          <Button onClick={handleConfirm} disabled={!canConfirm || busy}>
            Di chuyển
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const LIFECYCLE_LABELS: Record<string, string> = {
  draft: "Bản nháp",
  processing: "Đang xử lý",
  ready: "Sẵn sàng",
};

export function FileInfoDialog({
  file,
  onClose,
}: {
  file: ExplorerFile | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={Boolean(file)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="break-all">Thông tin tài liệu</DialogTitle>
          <DialogDescription>{file?.title}</DialogDescription>
        </DialogHeader>
        <div>
          {file ? (
            <dl className="flex flex-col gap-2 text-sm">
              {[
                ["Loại", TYPE_LABELS[file.type] ?? file.type],
                ["Quyền xem", VISIBILITY_LABELS[file.visibility] ?? file.visibility],
                ["Trạng thái", LIFECYCLE_LABELS[file.lifecycleState] ?? file.lifecycleState],
                [
                  "Kích thước",
                  typeof file.sizeBytes === "number"
                    ? formatBytes(file.sizeBytes)
                    : "—",
                ],
                [
                  "Ngày tạo",
                  file.createdAt ? formatDate(file.createdAt) : "—",
                ],
                ...(file.youtubeId
                  ? [["YouTube ID", file.youtubeId]]
                  : []),
                ...(file.externalUrl
                  ? [["Liên kết", file.externalUrl]]
                  : []),
              ].map(([label, value]) => (
                <div key={label} className="flex gap-3">
                  <dt className="w-28 shrink-0 text-muted-foreground">{label}</dt>
                  <dd className="min-w-0 break-all font-medium">{value}</dd>
                </div>
              ))}
            </dl>
          ) : null}
        </div>
        <DialogFooter>
          <DialogClose render={<Button variant="ghost" />}>Đóng</DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
