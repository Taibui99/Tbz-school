"use client";

import { useActionState, useState } from "react";
import { Tag as TagIcon } from "lucide-react";
import { setTagsAction } from "@/lib/resource/actions";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export type TagItem = { id: string; name: string };

export function TagPicker({
  resourceId,
  allTags,
  selectedIds,
}: {
  resourceId: string;
  allTags: TagItem[];
  selectedIds: string[];
}) {
  const [selected, setSelected] = useState<Set<string>>(
    new Set(selectedIds),
  );
  const [state, formAction, pending] = useActionState(setTagsAction, {});

  function toggle(tagId: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(tagId)) {
        next.delete(tagId);
      } else {
        next.add(tagId);
      }
      return next;
    });
  }

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="resourceId" value={resourceId} />
      {state.error && (
        <Alert variant="destructive">
          <AlertTitle>Lỗi</AlertTitle>
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}
      {state.success && (
        <Alert>
          <AlertTitle>Đã lưu</AlertTitle>
          <AlertDescription>{state.success}</AlertDescription>
        </Alert>
      )}
      <div className="flex flex-wrap gap-2">
        {allTags.map((tag) => (
          <label
            key={tag.id}
            className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition-colors ${
              selected.has(tag.id)
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-card text-muted-foreground hover:bg-accent"
            }`}
          >
            <input
              type="checkbox"
              name="tagId"
              value={tag.id}
              checked={selected.has(tag.id)}
              onChange={() => toggle(tag.id)}
              className="sr-only"
            />
            <TagIcon className="size-3.5" aria-hidden="true" />
            {tag.name}
          </label>
        ))}
      </div>
      <div>
        <Button type="submit" variant="outline" size="sm" disabled={pending}>
          {pending ? "Đang lưu..." : "Lưu thẻ"}
        </Button>
      </div>
    </form>
  );
}