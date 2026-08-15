"use client";

import { useEffect } from "react";
import { recordOpenAction } from "@/lib/resource/actions";

export function RecordOpen({ resourceId }: { resourceId: string }) {
  useEffect(() => {
    recordOpenAction(resourceId).catch(() => {});
  }, [resourceId]);

  return null;
}