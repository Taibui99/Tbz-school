import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Database, Download, ExternalLink as ExternalLinkIcon } from "lucide-react";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { createClient } from "@/lib/supabase/server";
import { TypeIcon } from "@/components/resource/type-icon";
import { FavoriteButton } from "@/components/resource/favorite-button";
import { TagPicker } from "@/components/resource/tag-picker";
import {
  DeleteResourceDialog,
  EditResourceDialog,
  ExternalLink,
  TYPE_LABELS,
  VISIBILITY_LABELS,
} from "@/components/resource/resource-dialogs";
import { evaluateDownload } from "@/lib/resource/download";
import { resolveViewer } from "@/lib/resource/view";
import { ResourceArea } from "@/components/annotation/resource-area";
import { RecordOpen } from "@/components/resource/record-open";
import { UploadFileButton } from "@/components/upload/upload-file-button";
import { StaleUploadCleaner } from "@/components/upload/stale-upload-cleaner";
import { SharePanel } from "@/components/resource/share-panel";
import { VersionsPanel } from "@/components/resource/versions-panel";
import { getShareInfo } from "@/lib/resource/public";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Chi tiết tài liệu",
  description: "Thông tin và quản lý tài liệu.",
};

function lifecycleLabel(state: string): string {
  switch (state) {
    case "ready":
      return "Sẵn sàng";
    case "draft":
      return "Chờ tải lên";
    case "uploading":
      return "Đang tải lên";
    case "processing":
      return "Đang xử lý";
    case "failed":
      return "Lỗi";
    default:
      return state;
  }
}

function formatBytes(bytes: number | null): string {
  if (bytes === null) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default async function ResourceDetailPage({
  params,
}: {
  params: Promise<{
    id: string;
    collectionId: string;
    lessonId: string;
    resourceId: string;
  }>;
}) {
  const { id, collectionId, lessonId, resourceId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/dang-nhap");

  const { data: workspace } = await supabase
    .from("workspaces")
    .select("name")
    .eq("id", id)
    .maybeSingle();
  if (!workspace) notFound();

  const { data: collection } = await supabase
    .from("collections")
    .select("name")
    .eq("id", collectionId)
    .maybeSingle();
  if (!collection) notFound();

  const { data: lesson } = await supabase
    .from("lessons")
    .select("name")
    .eq("id", lessonId)
    .maybeSingle();
  if (!lesson) notFound();

  const { data: resource } = await supabase
    .from("resources")
    .select(
      "id, title, description, type, visibility, lifecycle_state, provider, storage_key, external_url, youtube_id, size_bytes, content_hash, original_filename, mime, created_at, updated_at, deleted_at, resource_files(id, provider, storage_key, mime, size_bytes, sha256, version, created_at), external_resources(url, provider_type, title, thumbnail_url), resource_tags(tag_id, tags(id, name)), favorites(id)",
    )
    .eq("id", resourceId)
    .eq("favorites.user_id", user.id)
    .maybeSingle();
  if (!resource) notFound();

  const { data: tags } = await supabase
    .from("tags")
    .select("id, name")
    .order("name");

  const downloadVerdict = evaluateDownload({
    type: resource.type,
    lifecycleState: resource.lifecycle_state,
    deletedAt: resource.deleted_at,
    provider: resource.provider,
    storageKey: resource.storage_key,
    externalUrl: resource.external_url,
  });

  const favorite = (resource.favorites?.length ?? 0) > 0;
  const selectedTagIds = (resource.resource_tags ?? []).map(
    (item) => item.tag_id,
  );

  const viewer = await resolveViewer({
    type: resource.type,
    mime: resource.mime,
    lifecycle_state: resource.lifecycle_state,
    provider: resource.provider,
    storage_key: resource.storage_key,
    external_url: resource.external_url,
    youtube_id: resource.youtube_id,
    deleted_at: resource.deleted_at,
  });
  const downloadUrl =
    downloadVerdict.allowed && viewer.kind !== "url" && "url" in viewer
      ? viewer.url
      : null;

  const shareInfo = await getShareInfo(supabase, resource.id);

  const downloadReasonLabel: Record<string, string> = {
    external: "Tài liệu ngoài không tải được qua TBZ School.",
    "not-ready": "Tài liệu chưa sẵn sàng để tải.",
    "no-file": "Tài liệu chưa có tệp (chờ tải lên).",
    deleted: "Tài liệu đã bị xóa.",
  };

  return (
    <div className="px-4 py-8">
      <RecordOpen resourceId={resource.id} />
      {resource.lifecycle_state === "uploading" && resource.updated_at && (
        <StaleUploadCleaner resourceId={resource.id} updatedAt={resource.updated_at} />
      )}
      <Breadcrumbs
        items={[
          { href: "/kho", label: "Kho của tôi" },
          { href: `/kho/${id}`, label: workspace.name },
          { href: `/kho/${id}/${collectionId}`, label: collection.name },
          { href: `/kho/${id}/${collectionId}/${lessonId}`, label: lesson.name },
          { label: resource.title },
        ]}
      />

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <TypeIcon type={resource.type} className="size-8 shrink-0" />
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-semibold tracking-tight">
              {resource.title}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {TYPE_LABELS[resource.type] ?? resource.type} ·{" "}
              {VISIBILITY_LABELS[resource.visibility] ?? resource.visibility} ·{" "}
              {lifecycleLabel(resource.lifecycle_state)}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <FavoriteButton resourceId={resource.id} initialFavorite={favorite} />
          <EditResourceDialog
            resource={{
              id: resource.id,
              title: resource.title,
              description: resource.description,
              type: resource.type,
              visibility: resource.visibility,
              externalUrl: resource.external_url,
              youtubeId: resource.youtube_id,
            }}
            workspaceId={id}
            collectionId={collectionId}
            lessonId={lessonId}
          />
          <DeleteResourceDialog resource={resource} />
        </div>
      </div>

      {resource.description && (
        <p className="mt-4 max-w-2xl text-sm text-muted-foreground">
          {resource.description}
        </p>
      )}

      <section className="mt-6">
        <h2 className="mb-2 text-sm font-medium">Xem tài liệu</h2>
        <ResourceArea
          viewer={viewer}
          resourceId={resource.id}
          downloadUrl={downloadUrl}
        />
      </section>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-border bg-card p-4">
          <h2 className="flex items-center gap-2 text-sm font-medium">
            <Database aria-hidden="true" className="size-4 text-muted-foreground" />
            Thông tin tệp
          </h2>
          <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
            <dt className="text-muted-foreground">Trạng thái</dt>
            <dd>{lifecycleLabel(resource.lifecycle_state)}</dd>
            <dt className="text-muted-foreground">Nhà cung cấp lưu trữ</dt>
            <dd>{resource.provider ?? "—"}</dd>
            <dt className="text-muted-foreground">Khóa lưu trữ</dt>
            <dd className="truncate font-mono text-xs">{resource.storage_key ?? "—"}</dd>
            <dt className="text-muted-foreground">Kiểu MIME</dt>
            <dd>{resource.mime ?? "—"}</dd>
            <dt className="text-muted-foreground">Kích thước</dt>
            <dd>{formatBytes(resource.size_bytes)}</dd>
            <dt className="text-muted-foreground">Tên gốc</dt>
            <dd>{resource.original_filename ?? "—"}</dd>
            <dt className="text-muted-foreground">Mã băm (SHA-256)</dt>
            <dd className="truncate font-mono text-xs">
              {resource.content_hash ?? "—"}
            </dd>
          </dl>
          {(resource.resource_files?.length ?? 0) > 0 && (
            <div className="mt-3 border-t border-border pt-3">
              <p className="text-xs text-muted-foreground">
                Phiên bản tệp:{" "}
                {resource.resource_files
                  .map((file) => `v${file.version} (${file.provider})`)
                  .join(", ")}
              </p>
            </div>
          )}
        </section>

        <section className="rounded-xl border border-border bg-card p-4">
          <h2 className="flex items-center gap-2 text-sm font-medium">
            <Download aria-hidden="true" className="size-4 text-muted-foreground" />
            Tải về
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {downloadVerdict.allowed
              ? "Tài liệu sẵn sàng để tải về."
              : downloadReasonLabel[downloadVerdict.reason]}
          </p>
          {downloadUrl && (
            <div className="mt-3">
              <Button render={<a href={downloadUrl} download />}>
                <Download aria-hidden="true" />
                Tải về
              </Button>
            </div>
          )}
          {resource.lifecycle_state !== "ready" &&
            !resource.external_url &&
            resource.type !== "url" && (
              <div className="mt-4">
                <UploadFileButton resourceId={resource.id} />
              </div>
            )}
          {resource.external_url && (
            <div className="mt-3">
              <ExternalLink url={resource.external_url} />
            </div>
          )}
          {(() => {
            const ext = Array.isArray(resource.external_resources)
              ? resource.external_resources[0]
              : resource.external_resources;
            if (!ext?.url) return null;
            return (
              <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
                <dt className="text-muted-foreground">Đường dẫn gốc</dt>
                <dd className="truncate font-mono text-xs">{ext.url}</dd>
              </dl>
            );
          })()}
        </section>
      </div>

      <section className="mt-6 rounded-xl border border-border bg-card p-4">
        <h2 className="flex items-center gap-2 text-sm font-medium">
          <ExternalLinkIcon aria-hidden="true" className="size-4 text-muted-foreground" />
          Thẻ (tags)
        </h2>
        <div className="mt-3">
          <TagPicker
            resourceId={resource.id}
            allTags={(tags ?? []).map((tag) => ({ id: tag.id, name: tag.name }))}
            selectedIds={selectedTagIds}
          />
        </div>
      </section>

      <section className="mt-6 rounded-xl border border-border bg-card p-4">
        <h2 className="flex items-center gap-2 text-sm font-medium">
          <Download aria-hidden="true" className="size-4 text-muted-foreground" />
          Phiên bản tệp
        </h2>
        <div className="mt-3">
          <VersionsPanel
            resourceId={resource.id}
            files={(resource.resource_files ?? []).map((file) => ({
              id: file.id,
              version: file.version,
              provider: file.provider,
              storage_key: file.storage_key,
              mime: file.mime,
              size_bytes: file.size_bytes,
              sha256: file.sha256,
              created_at: file.created_at ?? "",
            }))}
            currentKey={resource.storage_key}
            canUpload={
              resource.lifecycle_state === "ready" &&
              resource.type !== "url" &&
              !!resource.storage_key
            }
          />
        </div>
      </section>

      <div className="mt-6">
        <SharePanel
          resourceId={resource.id}
          linkToken={shareInfo.linkToken}
          grants={shareInfo.grants}
        />
      </div>

      <dl className="mt-6 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
        <dt className="text-muted-foreground">Tạo lúc</dt>
        <dd>{formatDate(resource.created_at)}</dd>
        <dt className="text-muted-foreground">Cập nhật lúc</dt>
        <dd>{formatDate(resource.updated_at)}</dd>
      </dl>
    </div>
  );
}