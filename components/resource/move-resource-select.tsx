"use client";

import { MoveRight } from "lucide-react";
import { moveResourceAction } from "@/lib/workspace/actions";
import { asVoidAction } from "@/lib/form-action";
import { Button } from "@/components/ui/button";

export function MoveResourceSelect({
  resourceId,
  workspaceId,
  currentLessonId,
  lessons,
}: {
  resourceId: string;
  workspaceId: string;
  currentLessonId: string;
  lessons: { id: string; name: string }[];
}) {
  if (lessons.length <= 1) return null;

  return (
    <form
      action={asVoidAction(moveResourceAction)}
      className="flex items-center gap-2"
    >
      <input type="hidden" name="resourceId" value={resourceId} />
      <input type="hidden" name="workspaceId" value={workspaceId} />
      <MoveRight className="size-4 text-muted-foreground" aria-hidden="true" />
      <label htmlFor={`move-${resourceId}`} className="sr-only">
        Di chuyển tài liệu
      </label>
      <select
        id={`move-${resourceId}`}
        name="targetLessonId"
        defaultValue=""
        className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        required
      >
        <option value="" disabled>
          Di chuyển đến...
        </option>
        {lessons
          .filter((item) => item.id !== currentLessonId)
          .map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
      </select>
      <Button type="submit" variant="outline" size="sm">
        Di chuyển
      </Button>
    </form>
  );
}