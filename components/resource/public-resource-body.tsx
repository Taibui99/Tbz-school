import Link from "next/link";
import { Download } from "lucide-react";
import { TypeIcon } from "@/components/resource/type-icon";
import { FavoriteButton } from "@/components/resource/favorite-button";
import { SaveToLibrary } from "@/components/resource/save-to-library";
import { ReportForm } from "@/components/resource/report-form";
import { ResourceViewer } from "@/components/viewer/resource-viewer";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "@/components/resource/resource-dialogs";
import { TYPE_LABELS, VISIBILITY_LABELS } from "@/components/resource/resource-dialogs";
import type { ViewerResult } from "@/lib/resource/view";
import type { PublicOwner } from "@/lib/resource/public";

export interface PublicResource {
  id: string;
  owner_id: string;
  title: string;
  description: string | null;
  type: string;
  visibility: string;
  mime: string | null;
  lifecycle_state: string;
  provider: string | null;
  storage_key: string | null;
  external_url: string | null;
  created_at: string | null;
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
  }).format(new Date(value));
}

const DOWNLOAD_REASON: Record<string, string> = {
  external: "Tài liệu ngoài không tải được qua TBZ School.",
  "not-ready": "Tài liệu chưa sẵn sàng để tải.",
  "no-file": "Tài liệu chưa có tệp.",
  deleted: "Tài liệu đã bị xóa.",
};

export function PublicResourceBody({
  resource,
  owner,
  viewer,
  downloadUrl,
  downloadReason,
  favorite,
  currentUserId,
}: {
  resource: PublicResource;
  owner: PublicOwner | null;
  viewer: ViewerResult;
  downloadUrl: string | null;
  downloadReason: string | null;
  favorite: boolean;
  currentUserId: string | null;
}) {
  const isOwn = currentUserId !== null && currentUserId === resource.owner_id;

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <TypeIcon type={resource.type} className="size-8 shrink-0" />
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-semibold tracking-tight">
              {resource.title}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {TYPE_LABELS[resource.type] ?? resource.type} ·{" "}
              {VISIBILITY_LABELS[resource.visibility] ?? resource.visibility} ·{" "}
              {formatDate(resource.created_at)}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {currentUserId && <FavoriteButton resourceId={resource.id} initialFavorite={favorite} />}
          {currentUserId && !isOwn && <SaveToLibrary resourceId={resource.id} />}
        </div>
      </div>

      {owner && (
        <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">
            {owner.full_name ?? "Người dùng TBZ"}
          </span>
          <span>đăng tải</span>
        </p>
      )}

      {resource.description && (
        <p className="mt-4 max-w-2xl text-sm text-muted-foreground">
          {resource.description}
        </p>
      )}

      <section className="mt-6">
        <h2 className="mb-2 text-sm font-medium">Xem tài liệu</h2>
        <ResourceViewer
          viewer={viewer}
          resourceId={resource.id}
          downloadUrl={downloadUrl}
        />
      </section>

      <section className="mt-6 rounded-xl border border-border bg-card p-4">
        <h2 className="text-sm font-medium">Tải về</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {downloadUrl
            ? "Tài liệu sẵn sàng để tải về."
            : downloadReason
              ? DOWNLOAD_REASON[downloadReason]
              : "Tài liệu không thể tải về."}
        </p>
        {downloadUrl && (
          <div className="mt-3">
            <Button render={<a href={downloadUrl} download />}>
              <Download aria-hidden="true" />
              Tải về
            </Button>
          </div>
        )}
        {resource.external_url && (
          <div className="mt-3">
            <ExternalLink url={resource.external_url} />
          </div>
        )}
      </section>

      <section className="mt-6 rounded-xl border border-border bg-card p-4">
        <h2 className="text-sm font-medium">Báo cáo tài liệu</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Thấy nội dung không phù hợp? Báo cáo để đội ngũ TBZ School xem xét.
        </p>
        <div className="mt-3 max-w-md">
          <ReportForm resourceId={resource.id} />
        </div>
      </section>

      <p className="mt-6 text-xs text-muted-foreground">
        <Link href="/kham-pha" className="underline underline-offset-2">
          Khám phá thêm tài liệu công khai
        </Link>
      </p>
    </div>
  );
}