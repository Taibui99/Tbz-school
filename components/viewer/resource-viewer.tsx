"use client";

import { lazy, Suspense } from "react";
import { FileQuestion, Loader2 } from "lucide-react";
import type { ViewerResult } from "@/lib/resource/view";
import { ExternalLink } from "@/components/resource/resource-dialogs";

const PdfViewer = lazy(() =>
  import("./pdf-viewer").then((m) => ({ default: m.PdfViewer })),
);
const VideoViewer = lazy(() =>
  import("./video-viewer").then((m) => ({ default: m.VideoViewer })),
);
const TextViewer = lazy(() =>
  import("./text-viewer").then((m) => ({ default: m.TextViewer })),
);
const DocxViewer = lazy(() =>
  import("./docx-viewer").then((m) => ({ default: m.DocxViewer })),
);
const XlsxViewer = lazy(() =>
  import("./xlsx-viewer").then((m) => ({ default: m.XlsxViewer })),
);
const PptxViewer = lazy(() =>
  import("./pptx-viewer").then((m) => ({ default: m.PptxViewer })),
);

function Loading() {
  return (
    <div className="flex h-40 items-center justify-center gap-2 text-sm text-muted-foreground">
      <Loader2 className="size-4 animate-spin" aria-hidden="true" />
      Đang tải trình xem…
    </div>
  );
}

export function ResourceViewer({
  viewer,
  resourceId,
  downloadUrl,
  onPageChange,
  onTimeChange,
}: {
  viewer: ViewerResult;
  resourceId: string;
  downloadUrl?: string | null;
  onPageChange?: (page: number) => void;
  onTimeChange?: (seconds: number) => void;
}) {
  if (viewer.kind === "url") {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-card py-12 text-center">
        <p className="text-sm text-muted-foreground">
          Đây là tài liệu liên kết ngoài.
        </p>
        {viewer.url && <ExternalLink url={viewer.url} />}
      </div>
    );
  }

  if (viewer.kind === "office" || viewer.kind === "unsupported") {
    if (viewer.kind === "office" && viewer.previewType && viewer.url) {
      return (
        <Suspense fallback={<Loading />}>
          {viewer.previewType === "docx" && (
            <DocxViewer src={viewer.url} downloadUrl={downloadUrl} />
          )}
          {(viewer.previewType === "xlsx" || viewer.previewType === "xls") && (
            <XlsxViewer src={viewer.url} downloadUrl={downloadUrl} />
          )}
          {viewer.previewType === "pptx" && (
            <PptxViewer src={viewer.url} downloadUrl={downloadUrl} />
          )}
        </Suspense>
      );
    }
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-card py-12 text-center">
        <FileQuestion aria-hidden="true" className="size-8 text-muted-foreground" />
        <div>
          <p className="font-medium">Chưa xem trước được định dạng này</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {viewer.kind === "office"
              ? "Tệp văn phòng cần chuyển đổi — bạn có thể tải về để mở trực tiếp."
              : "Trình duyệt không hỗ trợ xem loại tài liệu này — bạn có thể tải về."}
          </p>
        </div>
        {downloadUrl && (
          <a
            href={downloadUrl}
            download
            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/80"
          >
            Tải về
          </a>
        )}
      </div>
    );
  }

  if (viewer.kind === "video" && viewer.youtubeId) {
    return (
      <Suspense fallback={<Loading />}>
        <VideoViewer
          src={viewer.url ?? ""}
          resourceId={resourceId}
          downloadUrl={downloadUrl}
          onTimeChange={onTimeChange}
          youtubeId={viewer.youtubeId}
        />
      </Suspense>
    );
  }

  if (!("url" in viewer) || viewer.url === null) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-card py-12 text-center">
        <FileQuestion aria-hidden="true" className="size-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Tài liệu chưa sẵn sàng để xem.
        </p>
      </div>
    );
  }

  return (
    <Suspense fallback={<Loading />}>
      {viewer.kind === "pdf" && (
        <PdfViewer
          src={viewer.url}
          resourceId={resourceId}
          downloadUrl={downloadUrl}
          onPageChange={onPageChange}
        />
      )}
      {viewer.kind === "video" && (
        <VideoViewer
          src={viewer.url}
          resourceId={resourceId}
          downloadUrl={downloadUrl}
          onTimeChange={onTimeChange}
          youtubeId={viewer.youtubeId}
        />
      )}
      {viewer.kind === "text" && (
        <TextViewer src={viewer.url} downloadUrl={downloadUrl} />
      )}
      {viewer.kind === "image" && (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={viewer.url}
            alt="Xem trước hình ảnh"
            className="mx-auto max-h-[70vh] w-auto object-contain"
          />
        </div>
      )}
      {viewer.kind === "audio" && (
        <div className="rounded-xl border border-border bg-card p-4">
          <audio src={viewer.url} controls className="w-full" />
        </div>
      )}
    </Suspense>
  );
}