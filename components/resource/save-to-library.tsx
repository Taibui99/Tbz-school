"use client";

import { useActionState } from "react";
import { BookmarkPlus } from "lucide-react";
import { savePublicResourceAction } from "@/lib/resource/share-actions";
import type { ActionResult } from "@/lib/workspace/actions";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function SaveToLibrary({ resourceId }: { resourceId: string }) {
  const [state, action, pending] = useActionState(
    savePublicResourceAction,
    {} as ActionResult,
  );

  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="resourceId" value={resourceId} />
      <Button type="submit" disabled={pending}>
        <BookmarkPlus aria-hidden="true" />
        Lưu vào kho của tôi
      </Button>
      {state?.error && (
        <Alert variant="destructive" className="py-2">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}
    </form>
  );
}