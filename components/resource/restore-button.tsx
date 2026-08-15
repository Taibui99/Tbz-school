"use client";

import { useTransition } from "react";
import { RotateCcw } from "lucide-react";
import { restoreResourceAction } from "@/lib/resource/actions";
import { Button } from "@/components/ui/button";

export function RestoreButton({ resourceId }: { resourceId: string }) {
  const [isPending, startTransition] = useTransition();

  function restore() {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("id", resourceId);
      await restoreResourceAction(formData);
    });
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={isPending}
      onClick={restore}
    >
      <RotateCcw aria-hidden="true" />
      Khôi phục
    </Button>
  );
}