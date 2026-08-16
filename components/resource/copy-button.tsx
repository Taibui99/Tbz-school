"use client";

import { Copy } from "lucide-react";
import { copyResourceAction } from "@/lib/resource/actions";
import { Button } from "@/components/ui/button";
import { asVoidAction } from "@/lib/form-action";

export function CopyResourceButton({ resourceId }: { resourceId: string }) {
  return (
    <form action={asVoidAction(copyResourceAction)}>
      <input type="hidden" name="id" value={resourceId} />
      <Button variant="ghost" size="icon-sm" aria-label="Nhân bản tài liệu">
        <Copy aria-hidden="true" />
      </Button>
    </form>
  );
}