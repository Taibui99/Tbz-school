"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FolderInput } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { FolderPicker, type PickerFolder } from "@/components/explorer/folder-picker";
import { setResourceFolderAction } from "@/lib/folders/actions";

export function MoveToFolderButton({
  resourceId,
  currentFolderId,
  folders,
}: {
  resourceId: string;
  currentFolderId: string | null;
  folders: (PickerFolder & { path: string })[];
}) {
  const router = useRouter();
  const pushToast = useToast();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function pick(target: string | null) {
    if (target === currentFolderId) {
      setOpen(false);
      return;
    }
    setBusy(true);
    const fd = new FormData();
    fd.set("resourceId", resourceId);
    if (target) fd.set("targetFolderId", target);
    const result = await setResourceFolderAction(fd);
    setBusy(false);
    if (result.error) {
      pushToast({ title: "Di chuyển thất bại", description: result.error, variant: "error" });
      return;
    }
    pushToast({ title: "Đã di chuyển tài liệu", variant: "success" });
    setOpen(false);
    router.push(target ? `/kho?f=${encodeURIComponent(target)}` : "/kho");
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label="Di chuyển tới thư mục khác"
        disabled={busy}
        onClick={() => setOpen(true)}
      >
        <FolderInput aria-hidden="true" />
      </Button>

      <Dialog open={open} onOpenChange={(o) => !busy && setOpen(o)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Di chuyển tới…</DialogTitle>
            <DialogDescription>
              Chọn thư mục đích cho tài liệu này.
            </DialogDescription>
          </DialogHeader>
          <FolderPicker
            folders={folders}
            currentId={currentFolderId}
            onPick={(target) => void pick(target)}
          />
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => setOpen(false)}
            >
              Hủy
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export type { PickerFolder };
