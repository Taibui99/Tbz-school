"use client";

import { useActionState, useState } from "react";
import { ChevronDown, ChevronUp, Pencil, Plus, Trash2 } from "lucide-react";
import {
  createLessonAction,
  deleteLessonAction,
  moveLessonAction,
  updateLessonAction,
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

export type LessonData = {
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
        <Label htmlFor="name">Tên bài học</Label>
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

export function CreateLessonDialog({
  workspaceId,
  collectionId,
}: {
  workspaceId: string;
  collectionId: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    createLessonAction,
    {},
  );


  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <Plus aria-hidden="true" />
        Tạo bài học
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tạo bài học</DialogTitle>
          <DialogDescription>
            Mỗi bài học chứa các tài liệu liên quan.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="collectionId" value={collectionId} />
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

export function EditLessonDialog({
  lesson,
  workspaceId,
}: {
  lesson: LessonData;
  workspaceId: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    updateLessonAction,
    {},
  );


  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="ghost" size="icon-sm" />}>
        <span className="sr-only">Sửa bài học</span>
        <Pencil aria-hidden="true" />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Sửa bài học</DialogTitle>
          <DialogDescription>Cập nhật tên và mô tả bài học.</DialogDescription>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="id" value={lesson.id} />
          <input type="hidden" name="workspaceId" value={workspaceId} />
          {state.error && (
            <Alert variant="destructive">
              <AlertTitle>Lỗi</AlertTitle>
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          )}
          <NameFields
            state={state}
            defaultValue={lesson.name}
            defaultDescription={lesson.description ?? ""}
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

export function DeleteLessonDialog({
  lesson,
  workspaceId,
  collectionId,
  description,
}: {
  lesson: LessonData;
  workspaceId: string;
  collectionId: string;
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
        <span className="sr-only">Xóa bài học</span>
        <Trash2 aria-hidden="true" />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Xóa bài học?</DialogTitle>
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
          <form action={asVoidAction(deleteLessonAction)}>
            <input type="hidden" name="id" value={lesson.id} />
            <input type="hidden" name="collectionId" value={collectionId} />
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

export function LessonMoveButtons({
  id,
  workspaceId,
  collectionId,
  isFirst,
  isLast,
}: {
  id: string;
  workspaceId: string;
  collectionId: string;
  isFirst: boolean;
  isLast: boolean;
}) {
  return (
    <div className="flex items-center gap-0.5">
      <form action={asVoidAction(moveLessonAction)}>
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="collectionId" value={collectionId} />
        <input type="hidden" name="workspaceId" value={workspaceId} />
        <input type="hidden" name="direction" value="up" />        <Button
          type="submit"
          variant="ghost"
          size="icon-xs"
          disabled={isFirst}
          aria-label="Di chuyển lên"
        >
          <ChevronUp aria-hidden="true" />
        </Button>
      </form>
      <form action={asVoidAction(moveLessonAction)}>
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="collectionId" value={collectionId} />
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