"use client";

import { useActionState, useState } from "react";
import { ChevronDown, ChevronUp, FolderPlus, Pencil, Trash2 } from "lucide-react";
import {
  createCollectionAction,
  deleteCollectionAction,
  moveCollectionAction,
  updateCollectionAction,
  type ActionResult,
} from "@/lib/workspace/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { asVoidAction } from "@/lib/form-action";

export type CollectionData = {
  id: string;
  name: string;
  description: string | null;
};

function NameFields({
  state,
  defaultValue,
  defaultDescription,
}: {
  state: ActionResult;
  defaultValue?: string;
  defaultDescription?: string;
}) {
  return (
    <>
      <div className="flex flex-col gap-2">
        <Label htmlFor="name">Tên bộ sưu tập</Label>
        <Input
          id="name"
          name="name"
          type="text"
          maxLength={100}
          required
          defaultValue={defaultValue}
          aria-invalid={Boolean(state.fieldErrors?.name)}
        />
        {state.fieldErrors?.name && (
          <p className="text-xs text-destructive">{state.fieldErrors.name}</p>
        )}
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="description">Mô tả (tùy chọn)</Label>
        <Textarea
          id="description"
          name="description"
          rows={3}
          maxLength={500}
          defaultValue={defaultDescription}
          aria-invalid={Boolean(state.fieldErrors?.description)}
        />
        {state.fieldErrors?.description && (
          <p className="text-xs text-destructive">
            {state.fieldErrors.description}
          </p>
        )}
      </div>
    </>
  );
}

export function CreateCollectionDialog({ workspaceId }: { workspaceId: string }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    createCollectionAction,
    {},
  );


  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <FolderPlus aria-hidden="true" />
        Tạo bộ sưu tập
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tạo bộ sưu tập</DialogTitle>
          <DialogDescription>
            Nhóm các bài học theo môn hoặc chủ đề.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="workspaceId" value={workspaceId} />
          {state.error && (
            <Alert variant="destructive">
              <AlertTitle>Lỗi</AlertTitle>
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          )}
          <NameFields state={state} />
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Đang tạo..." : "Tạo"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function EditCollectionDialog({
  collection,
  workspaceId,
}: {
  collection: CollectionData;
  workspaceId: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    updateCollectionAction,
    {},
  );


  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="ghost" size="icon-sm" />}>
        <span className="sr-only">Sửa bộ sưu tập</span>
        <Pencil aria-hidden="true" />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Sửa bộ sưu tập</DialogTitle>
          <DialogDescription>
            Cập nhật tên và mô tả bộ sưu tập.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="id" value={collection.id} />
          <input type="hidden" name="workspaceId" value={workspaceId} />
          {state.error && (
            <Alert variant="destructive">
              <AlertTitle>Lỗi</AlertTitle>
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          )}
          <NameFields
            state={state}
            defaultValue={collection.name}
            defaultDescription={collection.description ?? ""}
          />
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Đang lưu..." : "Lưu"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function DeleteCollectionDialog({
  collection,
  workspaceId,
  description,
}: {
  collection: CollectionData;
  workspaceId: string;
  description: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="ghost" size="icon-sm" className="text-destructive" />
        }
      >
        <span className="sr-only">Xóa bộ sưu tập</span>
        <Trash2 aria-hidden="true" />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Xóa bộ sưu tập?</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
          >
            Hủy
          </Button>
          <form action={asVoidAction(deleteCollectionAction)}>
            <input type="hidden" name="id" value={collection.id} />
            <input type="hidden" name="workspaceId" value={workspaceId} />
            <Button type="submit" variant="destructive">
              <Trash2 aria-hidden="true" />
              Xóa
            </Button>
          </form>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function MoveButtons({
  id,
  workspaceId,
  isFirst,
  isLast,
}: {
  id: string;
  workspaceId: string;
  isFirst: boolean;
  isLast: boolean;
}) {
  return (
    <div className="flex items-center gap-0.5">
      <form action={asVoidAction(moveCollectionAction)}>
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="workspaceId" value={workspaceId} />
        <input type="hidden" name="direction" value="up" />
        <Button
          type="submit"
          variant="ghost"
          size="icon-xs"
          disabled={isFirst}
          aria-label="Di chuyển lên"
        >
          <ChevronUp aria-hidden="true" />
        </Button>
      </form>
      <form action={asVoidAction(moveCollectionAction)}>
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="workspaceId" value={workspaceId} />
        <input type="hidden" name="direction" value="down" />
        <Button
          type="submit"
          variant="ghost"
          size="icon-xs"
          disabled={isLast}
          aria-label="Di chuyển xuống"
        >
          <ChevronDown aria-hidden="true" />
        </Button>
      </form>
    </div>
  );
}