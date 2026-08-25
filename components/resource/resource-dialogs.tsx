"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { Link2, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import {
  createResourceAction,
  deleteResourceAction,
  updateResourceAction,
} from "@/lib/resource/actions";
import {
  RESOURCE_TYPES,
  VISIBILITIES,
  type ResourceType,
} from "@/lib/resource/validate";
import type { ActionResult } from "@/lib/workspace/actions";
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
import { useToast } from "@/components/ui/toast";

export const TYPE_LABELS: Record<string, string> = {
  pdf: "PDF",
  doc: "DOC",
  docx: "DOCX",
  ppt: "PPT",
  pptx: "PPTX",
  xls: "XLS",
  xlsx: "XLSX",
  image: "Hình ảnh",
  video: "Video",
  audio: "Âm thanh",
  text: "Văn bản",
  url: "Liên kết ngoài",
};

export const VISIBILITY_LABELS: Record<string, string> = {
  private: "Riêng tư",
  unlisted: "Ẩn theo liên kết",
  public: "Công khai",
  shared: "Chia sẻ",
};

function selectClass(fieldError?: string): string {
  return `h-9 w-full rounded-lg border bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 ${fieldError ? "border-destructive" : "border-input"}`;
}

function ResourceFields({
  state,
  defaultValue,
  defaultDescription,
  defaultType,
  defaultVisibility,
  defaultUrl,
  defaultYoutubeUrl,
}: {
  state: ActionResult;
  defaultValue?: string;
  defaultDescription?: string;
  defaultType?: ResourceType;
  defaultVisibility?: string;
  defaultUrl?: string;
  defaultYoutubeUrl?: string;
}) {
  const [type, setType] = useState<ResourceType>(
    defaultType ?? "pdf",
  );

  return (
    <>
      <div className="flex flex-col gap-2">
        <Label htmlFor="title">Tiêu đề</Label>
        <Input
          id="title"
          name="title"
          type="text"
          maxLength={200}
          required
          defaultValue={defaultValue}
          aria-invalid={Boolean(state.fieldErrors?.title)}
        />
        {state.fieldErrors?.title && (
          <p className="text-xs text-destructive">{state.fieldErrors.title}</p>
        )}
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="description">Mô tả (tùy chọn)</Label>
        <Textarea
          id="description"
          name="description"
          rows={3}
          maxLength={1000}
          defaultValue={defaultDescription}
          aria-invalid={Boolean(state.fieldErrors?.description)}
        />
        {state.fieldErrors?.description && (
          <p className="text-xs text-destructive">
            {state.fieldErrors.description}
          </p>
        )}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="type">Loại tài liệu</Label>
          <select
            id="type"
            name="type"
            className={selectClass(state.fieldErrors?.type)}
            value={type}
            onChange={(event) => setType(event.target.value as ResourceType)}
          >
            {RESOURCE_TYPES.map((item) => (
              <option key={item} value={item}>
                {TYPE_LABELS[item]}
              </option>
            ))}
          </select>
          {state.fieldErrors?.type && (
            <p className="text-xs text-destructive">{state.fieldErrors.type}</p>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="visibility">Chế độ hiển thị</Label>
          <select
            id="visibility"
            name="visibility"
            defaultValue={defaultVisibility ?? "private"}
            className={selectClass(state.fieldErrors?.visibility)}
          >
            {VISIBILITIES.map((item) => (
              <option key={item} value={item}>
                {VISIBILITY_LABELS[item]}
              </option>
            ))}
          </select>
          {state.fieldErrors?.visibility && (
            <p className="text-xs text-destructive">
              {state.fieldErrors.visibility}
            </p>
          )}
        </div>
      </div>
      {type === "url" && (
        <div className="flex flex-col gap-2">
          <Label htmlFor="url">Đường dẫn</Label>
          <Input
            id="url"
            name="url"
            type="url"
            maxLength={2048}
            placeholder="https://..."
            defaultValue={defaultUrl}
            aria-invalid={Boolean(state.fieldErrors?.url)}
          />
          {state.fieldErrors?.url && (
            <p className="text-xs text-destructive">{state.fieldErrors.url}</p>
          )}
        </div>
      )}
      {type === "video" && (
        <div className="flex flex-col gap-2">
          <Label htmlFor="youtubeUrl">
            Liên kết YouTube (tùy chọn) — bài giảng
          </Label>
          <Input
            id="youtubeUrl"
            name="youtubeUrl"
            type="url"
            maxLength={2048}
            placeholder="https://youtu.be/xxxxxxxxxxx"
            defaultValue={defaultYoutubeUrl}
            aria-invalid={Boolean(state.fieldErrors?.youtubeUrl)}
          />
          {state.fieldErrors?.youtubeUrl && (
            <p className="text-xs text-destructive">
              {state.fieldErrors.youtubeUrl}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Video sẽ phát qua YouTube (không tốn dung lượng lưu trữ). Nếu bỏ
            trống, bạn có thể tải tệp mp4 lên như bình thường.
          </p>
        </div>
      )}
    </>
  );
}

export function CreateResourceDialog({
  workspaceId,
  collectionId,
  lessonId,
}: {
  workspaceId: string;
  collectionId: string;
  lessonId: string;
}) {
  const [open, setOpen] = useState(false);
  const pushToast = useToast();
  const [state, formAction, pending] = useActionState(
    async (_prev: ActionResult, formData: FormData): Promise<ActionResult> => {
      const result = await createResourceAction(_prev, formData);
      if (result.success) {
        pushToast({ title: "Đã tạo tài liệu.", variant: "success" });
        setOpen(false);
      }
      return result;
    },
    {} as ActionResult,
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <Plus aria-hidden="true" />
        Thêm tài liệu
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Thêm tài liệu</DialogTitle>
          <DialogDescription>
            Tạo tài liệu mới trong bài học — liên kết ngoài hoặc video YouTube.
            Để tải tệp, dùng nút &quot;Tải tệp lên&quot; trong trang tài liệu.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="workspaceId" value={workspaceId} />
          <input type="hidden" name="collectionId" value={collectionId} />
          <input type="hidden" name="lessonId" value={lessonId} />
          {state.error && (
            <Alert variant="destructive">
              <AlertTitle>Lỗi</AlertTitle>
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          )}
          <ResourceFields state={state} />
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending && (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              )}
              {pending ? "Đang tạo..." : "Tạo"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function EditResourceDialog({
  resource,
}: {
  resource: {
    id: string;
    title: string;
    description: string | null;
    type: ResourceType;
    visibility: string;
    externalUrl: string | null;
    youtubeId: string | null;
  };
  workspaceId?: string;
  collectionId?: string;
  lessonId?: string;
}) {
  const [open, setOpen] = useState(false);
  const pushToast = useToast();
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    async (_prev: ActionResult, formData: FormData): Promise<ActionResult> => {
      const result = await updateResourceAction(_prev, formData);
      if (result.success) {
        pushToast({ title: "Đã lưu thay đổi.", variant: "success" });
        setOpen(false);
        router.refresh();
      }
      return result;
    },
    {} as ActionResult,
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="ghost" size="icon-sm" />}>
        <span className="sr-only">Sửa tài liệu</span>
        <Pencil aria-hidden="true" />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Sửa tài liệu</DialogTitle>
          <DialogDescription>Cập nhật thông tin tài liệu.</DialogDescription>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="id" value={resource.id} />
          {state.error && (
            <Alert variant="destructive">
              <AlertTitle>Lỗi</AlertTitle>
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          )}
          <ResourceFields
            state={state}
            defaultValue={resource.title}
            defaultDescription={resource.description ?? ""}
            defaultType={resource.type}
            defaultVisibility={resource.visibility}
            defaultUrl={resource.externalUrl ?? ""}
            defaultYoutubeUrl={resource.youtubeId ?? ""}
          />
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending && (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              )}
              {pending ? "Đang lưu..." : "Lưu"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function DeleteResourceDialog({
  resource,
  workspaceId,
}: {
  resource: { id: string; title: string };
  workspaceId?: string;
}) {
  const [open, setOpen] = useState(false);
  const pushToast = useToast();
  const router = useRouter();
  const [_state, formAction, pending] = useActionState(
    async (_prev: ActionResult, formData: FormData): Promise<ActionResult> => {
      const result = await deleteResourceAction(formData);
      if (result.error) {
        pushToast({
          title: "Xóa tài liệu thất bại",
          description: result.error,
          variant: "error",
        });
      } else if (result.success) {
        pushToast({
          title: "Đã xóa tài liệu",
          description: `"${resource.title}" đã chuyển vào Thùng rác và có thể khôi phục.`,
          variant: "success",
        });
        setOpen(false);
        router.push(
          workspaceId ? `/kho?w=${encodeURIComponent(workspaceId)}` : "/kho",
        );
      }
      return result;
    },
    {} as ActionResult,
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="ghost" size="icon-sm" className="text-destructive" />
        }
      >
        <span className="sr-only">Xóa tài liệu</span>
        <Trash2 aria-hidden="true" />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Xóa tài liệu?</DialogTitle>
          <DialogDescription>
            &quot;{resource.title}&quot; sẽ chuyển vào thùng rác và có thể
            khôi phục sau.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => setOpen(false)}
          >
            Hủy
          </Button>
          <form action={formAction}>
            <input type="hidden" name="id" value={resource.id} />
            <Button type="submit" variant="destructive" disabled={pending}>
              {pending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <Trash2 aria-hidden="true" />
              )}
              {pending ? "Đang xóa..." : "Xóa"}
            </Button>
          </form>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ExternalLink({ url }: { url: string }) {
  return (
    <Button
      variant="outline"
      size="sm"
      render={<a href={url} target="_blank" rel="noopener noreferrer" />}
    >
      <Link2 aria-hidden="true" />
      Mở liên kết
    </Button>
  );
}