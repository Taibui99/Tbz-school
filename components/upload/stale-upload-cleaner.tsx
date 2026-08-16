"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { cleanupStaleUploadAction } from "@/lib/upload/actions";
import { isUploadSessionStale } from "@/lib/upload/validate";

export function StaleUploadCleaner({
  resourceId,
  updatedAt,
}: {
  resourceId: string;
  updatedAt: string;
}) {
  const router = useRouter();

  useEffect(() => {
    if (!isUploadSessionStale(updatedAt)) return;
    const formData = new FormData();
    formData.set("resourceId", resourceId);
    formData.set("updatedAt", updatedAt);
    cleanupStaleUploadAction(formData)
      .then((result) => {
        if (result.success) router.refresh();
      })
      .catch(() => {});
  }, [resourceId, updatedAt, router]);

  return null;
}