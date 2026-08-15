"use client";

import { useOptimistic, useTransition } from "react";
import { Star } from "lucide-react";
import { setFavoriteAction } from "@/lib/resource/actions";
import { Button } from "@/components/ui/button";

export function FavoriteButton({
  resourceId,
  initialFavorite,
}: {
  resourceId: string;
  initialFavorite: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [favorite, setFavorite] = useOptimistic(
    initialFavorite,
    (_state, next: boolean) => next,
  );

  function toggle() {
    startTransition(async () => {
      setFavorite(!favorite);
      const formData = new FormData();
      formData.set("resourceId", resourceId);
      formData.set("favorite", String(!favorite));
      await setFavoriteAction(formData);
    });
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      disabled={isPending}
      onClick={toggle}
      aria-label={favorite ? "Bỏ yêu thích" : "Thêm vào yêu thích"}
      aria-pressed={favorite}
    >
      <Star
        aria-hidden="true"
        className={favorite ? "fill-amber-400 text-amber-400" : ""}
      />
    </Button>
  );
}