"use client";

import { useCallback, useState } from "react";
import type { ViewerResult } from "@/lib/resource/view";
import { ResourceViewer } from "@/components/viewer/resource-viewer";
import { AnnotationSection } from "@/components/annotation/annotation-section";

export function ResourceArea({
  viewer,
  resourceId,
  downloadUrl,
}: {
  viewer: ViewerResult;
  resourceId: string;
  downloadUrl?: string | null;
}) {
  const [currentPage, setCurrentPage] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState<number | null>(null);
  const handlePage = useCallback((page: number) => setCurrentPage(page), []);
  const handleTime = useCallback((seconds: number) => setCurrentTime(seconds), []);

  return (
    <>
      <ResourceViewer
        viewer={viewer}
        resourceId={resourceId}
        downloadUrl={downloadUrl}
        onPageChange={viewer.kind === "pdf" ? handlePage : undefined}
        onTimeChange={viewer.kind === "video" ? handleTime : undefined}
      />
      <AnnotationSection
        resourceId={resourceId}
        viewerKind={viewer.kind}
        currentPage={currentPage}
        currentTime={currentTime}
      />
    </>
  );
}