"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, EyeOff, Loader2, RotateCcw, ShieldX } from "lucide-react";
import {
  hideResourceAction,
  resolveReportAction,
  unhideResourceAction,
} from "@/lib/admin/actions";
import type { ActionResult } from "@/lib/workspace/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";

function useAdminActionResult() {
  const pushToast = useToast();
  const router = useRouter();
  return useActionState(
    async (_prev: ActionResult, formData: FormData): Promise<ActionResult> => {
      const action = String(formData.get("__action") ?? "");
      let result: ActionResult;
      if (action === "hide") {
        result = await hideResourceAction(formData);
      } else if (action === "unhide") {
        result = await unhideResourceAction(formData);
      } else if (action === "resolve") {
        result = await resolveReportAction(formData);
      } else {
        result = { error: "Hành động không hợp lệ." };
      }
      if (result.error) {
        pushToast({
          title: "Thao tác thất bại",
          description: result.error,
          variant: "error",
        });
      } else if (result.success) {
        pushToast({ title: result.success, variant: "success" });
        router.refresh();
      }
      return result;
    },
    {},
  );
}

export function ResourceHideButton({
  resourceId,
  hidden,
}: {
  resourceId: string;
  hidden: boolean;
}) {
  const [_state, formAction, pending] = useAdminActionResult();

  return (
    <form action={formAction}>
      <input type="hidden" name="__action" value={hidden ? "unhide" : "hide"} />
      <input type="hidden" name="resourceId" value={resourceId} />
      <Button
        type="submit"
        variant={hidden ? "outline" : "ghost"}
        size="sm"
        disabled={pending}
      >
        {pending ? (
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        ) : hidden ? (
          <RotateCcw aria-hidden="true" />
        ) : (
          <EyeOff aria-hidden="true" />
        )}
        {hidden ? "Bỏ ẩn" : "Ẩn"}
      </Button>
    </form>
  );
}

export function ReportResolveButtons({
  reportId,
}: {
  reportId: string;
}) {
  const [_state, formAction, pending] = useAdminActionResult();
  const [withHide, setWithHide] = useState(true);

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-1.5">
      <input type="hidden" name="reportId" value={reportId} />
      <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <input
          type="checkbox"
          checked={withHide}
          onChange={(e) => setWithHide(e.target.checked)}
          className="size-3.5 accent-destructive"
        />
        Ẩn tài liệu
      </label>
      {withHide && <input type="hidden" name="alsoHide" value="1" />}
      <Input
        name="resolution"
        placeholder="Ghi chú xử lý (không bắt buộc)"
        className="h-8 w-48 text-xs"
        disabled={pending}
      />
      <Button
        type="submit"
        name="decision"
        value="resolved"
        size="sm"
        disabled={pending}
      >
        {pending ? (
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        ) : (
          <Check aria-hidden="true" />
        )}
        Xử lý
      </Button>
      <Button
        type="submit"
        name="decision"
        value="rejected"
        variant="outline"
        size="sm"
        disabled={pending}
      >
        <ShieldX aria-hidden="true" />
        Bỏ qua
      </Button>
    </form>
  );
}
