"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { Ban, Loader2, RotateCcw } from "lucide-react";
import {
  restoreUserAction,
  suspendUserAction,
} from "@/lib/admin/actions";
import type { ActionResult } from "@/lib/workspace/actions";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

export function UserActionsButton({
  userId,
  email,
  suspended,
}: {
  userId: string;
  email: string | null;
  suspended: boolean;
}) {
  const [confirming, setConfirming] = useState(false);
  const pushToast = useToast();
  const router = useRouter();
  const [_state, formAction, pending] = useActionState(
    async (_prev: ActionResult, formData: FormData): Promise<ActionResult> => {
      const result = suspended
        ? await restoreUserAction(formData)
        : await suspendUserAction(formData);
      if (result.error) {
        pushToast({
          title: "Thao tác thất bại",
          description: result.error,
          variant: "error",
        });
      } else if (result.success) {
        pushToast({
          title: `${suspended ? "Đã mở khóa" : "Đã khóa"} tài khoản ${email ?? userId}.`,
          variant: "success",
        });
        setConfirming(false);
        router.refresh();
      }
      return result;
    },
    {},
  );

  if (!suspended && !confirming) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setConfirming(true)}
      >
        <Ban aria-hidden="true" />
        Khóa
      </Button>
    );
  }

  return (
    <form action={formAction} className="flex items-center gap-1">
      <input type="hidden" name="userId" value={userId} />
      {!suspended && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={pending}
          onClick={() => setConfirming(false)}
        >
          Hủy
        </Button>
      )}
      <Button
        type="submit"
        variant={suspended ? "outline" : "destructive"}
        size="sm"
        disabled={pending}
      >
        {pending ? (
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        ) : suspended ? (
          <RotateCcw aria-hidden="true" />
        ) : (
          <Ban aria-hidden="true" />
        )}
        {pending ? "Đang xử lý..." : suspended ? "Mở khóa" : "Xác nhận khóa"}
      </Button>
    </form>
  );
}
