"use client";

import { useActionState, useState } from "react";
import { FolderPlus, Pencil, Trash2 } from "lucide-react";
import {
  createWorkspaceAction,
  deleteWorkspaceAction,
  updateWorkspaceAction,
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

export type WorkspaceData = {
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
        <Label htmlFor="name">Tên workspace</Label>
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

export function CreateWorkspaceDialog() {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    createWorkspaceAction,
    {},
  );


  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <FolderPlus aria-hidden="true" />
        Tạo workspace
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tạo workspace mới</DialogTitle>
          <DialogDescription>
            Không gian lưu trữ riêng cho tài liệu của bạn.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
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

export function EditWorkspaceDialog({
  workspace,
}: {
  workspace: WorkspaceData;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    updateWorkspaceAction,
    {},
  );


  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="ghost" size="icon-sm" />}>
        <span className="sr-only">Sửa workspace</span>
        <Pencil aria-hidden="true" />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Sửa workspace</DialogTitle>
          <DialogDescription>
            Cập nhật tên và mô tả workspace.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="id" value={workspace.id} />
          {state.error && (
            <Alert variant="destructive">
              <AlertTitle>Lỗi</AlertTitle>
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          )}
          <NameFields
            state={state}
            defaultValue={workspace.name}
            defaultDescription={workspace.description ?? ""}
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

export function DeleteWorkspaceDialog({
  workspace,
  description,
}: {
  workspace: WorkspaceData;
  description: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={<Button variant="ghost" size="icon-sm" className="text-destructive" />}
      >
        <span className="sr-only">Xóa workspace</span>
        <Trash2 aria-hidden="true" />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Xóa workspace?</DialogTitle>
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
          <form action={asVoidAction(deleteWorkspaceAction)}>
            <input type="hidden" name="id" value={workspace.id} />
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