import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ChevronRight,
  Download,
  Info,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { TypeIcon } from "@/components/resource/type-icon";
import { FavoriteButton } from "@/components/resource/favorite-button";
import {
  DeleteResourceDialog,
  EditResourceDialog,
  ExternalLink,
  TYPE_LABELS,
  VISIBILITY_LABELS,
} from "@/components/resource/resource-dialogs";
import { MoveToFolderButton } from "@/components/resource/move-to-folder-button";
import { ResourceSidePanel } from "@/components/resource/resource-side-panel";
import { TagPicker } from "@/components/resource/tag-picker";
import { evaluateDownload } from "@/lib/resource/download";
import { resolveViewer } from "@/lib/resource/view";
import { ResourceArea } from "@/components/annotation/resource-area";
import { RecordOpen } from "@/components/resource/record-open";
import { UploadFileButton } from "@/components/upload/upload-file-button";
import { StaleUploadCleaner } from "@/components/upload/stale-upload-cleaner";
import { SharePanel } from "@/components/resource/share-panel";
import { VersionsPanel } from "@/components/resource/versions-panel";
import { getShareInfo } from "@/lib/resource/public";
import { getGoogleConnection } from "@/lib/youtube/store";
import { YoutubePanel } from "@/components/resource/youtube-panel";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Xem tài liệu",
  description: "Xem và quản lý tài liệu.",
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

export default async function ResourceViewPage({
  params,
}: {
  params: Promise<{ resourceId: string }>;
}) {
  const { resourceId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/dang-nhap");

  const { data: resource } = await supabase
    .from("resources")
    .select(
      "id, owner_id, title, description, type, visibility, lifecycle_state, provider, storage_key, external_url, youtube_id, size_bytes, content_hash, original_filename, mime, folder_id, created_at, updated_at, deleted_at, resource_files(id, provider, storage_key, mime, size_bytes, sha256, version, created_at), external_resources(url, provider_type, title, thumbnail_url), resource_tags(tag_id, tags(id, name)), favorites(id)",
    )
    .eq("id", resourceId)
    .eq("favorites.user_id", user.id)
    .maybeSingle();
  if (!resource || resource.owner_id !== user.id) notFound();

  // Chuỗi thư mục chứa tài liệu (cho thanh địa chỉ).
  const folderChain: { id: string; name: string }[] = [];
  let cursor = resource.folder_id as string | null;
  while (cursor) {
    const { data: folder } = await supabase
      .from("folders")
      .select("id, parent_id, name")
      .eq("id", cursor)
      .maybeSingle();
    if (!folder) break;
    folderChain.unshift({ id: folder.id, name: folder.name });
    cursor = folder.parent_id;
  }

  const { data: allFolders } = await supabase
    .from("folders")
    .select("id, parent_id, name, path")
    .eq("owner_id", user.id)
    .is("deleted_at", null)
    .order("name");

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
    youtubeId: resource.youtube_id,
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
    original_filename: resource.original_filename,
  });

  const proxyViewer =
    viewer.kind === "pdf" && viewer.url && resource.storage_key
      ? { ...viewer, url: `/api/proxy/file?key=${encodeURIComponent(resource.storage_key)}` }
      : viewer;

  const downloadUrl =
    downloadVerdict.allowed && viewer.kind !== "url" && "url" in viewer
      ? viewer.url
      : null;

  const shareInfo = await getShareInfo(supabase, resource.id);
  const googleConnection =
    resource.type === "video" ? await getGoogleConnection() : null;

  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 py-6">
      <RecordOpen resourceId={resource.id} />
      {resource.lifecycle_state === "uploading" && resource.updated_at && (
        <StaleUploadCleaner resourceId={resource.id} updatedAt={resource.updated_at} />
      )}

      {/* ---- Thanh trên: quay lại · địa chỉ · hành động ---- */}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          render={
            <Link
              href={folderChain.length
                ? `/kho?f=${encodeURIComponent(folderChain[folderChain.length - 1].id)}`
                : "/kho"}
            />
          }
          variant="outline"
          size="icon-sm"
          aria-label="Quay lại kho"
        >
          ←
        </Button>

        <nav aria-label="Breadcrumb" className="flex min-w-0 flex-1 items-center gap-0.5 text-sm">
          <Link
            href="/kho"
            className="rounded-lg px-1.5 py-1 text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
          >
            Kho của tôi
          </Link>
          {folderChain.map((crumb, index) => (
            <span key={crumb.id} className="flex min-w-0 items-center gap-0.5">
              <ChevronRight className="size-3.5 shrink-0 text-muted-foreground/60" aria-hidden="true" />
              {index === folderChain.length - 1 ? (
                <span className="truncate rounded-lg px-1.5 py-1 font-medium">
                  {crumb.name}
                </span>
              ) : (
                <Link
                  href={`/kho?f=${encodeURIComponent(crumb.id)}`}
                  className="truncate rounded-lg px-1.5 py-1 text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
                >
                  {crumb.name}
                </Link>
              )}
            </span>
          ))}
          <ChevronRight className="size-3.5 shrink-0 text-muted-foreground/60" aria-hidden="true" />
          <span className="truncate rounded-lg px-1.5 py-1 font-medium">
            {resource.title}
          </span>
        </nav>

        <div className="flex shrink-0 items-center gap-1">
          <FavoriteButton resourceId={resource.id} initialFavorite={favorite} />
          <MoveToFolderButton
            resourceId={resource.id}
            currentFolderId={(resource.folder_id as string | null) ?? null}
            folders={(allFolders ?? []).map((f) => ({
              id: f.id,
              parentId: f.parent_id,
              name: f.name,
              path: f.path,
            }))}
          />
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
          />
          <DeleteResourceDialog resource={{ id: resource.id, title: resource.title }} />
        </div>
      </div>

      {/* ---- Nội dung chính + bảng chi tiết ---- */}
      <div className="mt-4 flex flex-col-reverse items-start gap-5 lg:flex-row">
        <div className="min-w-0 flex-1 space-y-5">
          <div className="flex min-w-0 items-start gap-3">
            <TypeIcon type={resource.type} className="mt-1 size-7 shrink-0" />
            <div className="min-w-0">
              <h1 className="text-xl font-semibold leading-snug tracking-tight lg:text-2xl">
                {resource.title}
              </h1>
              <p className="mt-1 text-xs text-muted-foreground">
                {TYPE_LABELS[resource.type] ?? resource.type} ·{" "}
                {VISIBILITY_LABELS[resource.visibility] ?? resource.visibility} ·{" "}
                {lifecycleLabel(resource.lifecycle_state)}
              </p>
            </div>
          </div>

          {resource.description && (
            <p className="max-w-2xl whitespace-pre-line text-sm text-muted-foreground">
              {resource.description}
            </p>
          )}

          <ResourceArea
            viewer={proxyViewer}
            resourceId={resource.id}
            downloadUrl={downloadUrl}
          />

          {downloadUrl && (
            <div className="flex flex-wrap items-center gap-2">
              <Button render={<a href={downloadUrl} download />}>
                <Download aria-hidden="true" />
                Tải về
              </Button>
              {resource.external_url && <ExternalLink url={resource.external_url} />}
              {resource.lifecycle_state !== "ready" &&
                !resource.external_url &&
                resource.type !== "url" && (
                  <UploadFileButton resourceId={resource.id} resourceType={resource.type} />
                )}
            </div>
          )}
          {!downloadUrl &&
            resource.lifecycle_state !== "ready" &&
            !resource.external_url &&
            resource.type !== "url" && (
              <UploadFileButton resourceId={resource.id} resourceType={resource.type} />
            )}
          {!downloadUrl && resource.external_url && (
            <ExternalLink url={resource.external_url} />
          )}

          {resource.type === "video" && (
            <YoutubePanel
              resourceId={resource.id}
              connected={googleConnection?.connected ?? false}
              connectedEmail={googleConnection?.email ?? null}
              hasFile={
                resource.lifecycle_state === "ready" &&
                !!resource.provider &&
                !!resource.storage_key
              }
              alreadyPublished={!!resource.youtube_id}
              isOwner={resource.owner_id === user.id}
            />
          )}
        </div>

        <ResourceSidePanel>
          {/* Tổng quan */}
          <section>
            <h2 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <Info aria-hidden="true" className="size-3.5" />
              Chi tiết
            </h2>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
              <dt className="text-muted-foreground">Kích thước</dt>
              <dd className="text-right">{formatBytes(resource.size_bytes)}</dd>
              <dt className="text-muted-foreground">Tên gốc</dt>
              <dd className="truncate text-right">{resource.original_filename ?? "—"}</dd>
              <dt className="text-muted-foreground">Tạo lúc</dt>
              <dd className="text-right">{formatDate(resource.created_at)}</dd>
              <dt className="text-muted-foreground">Cập nhật</dt>
              <dd className="text-right">{formatDate(resource.updated_at)}</dd>
            </dl>

            {(resource.resource_files?.length ?? 0) > 0 && (
              <details className="mt-3 rounded-xl border border-border bg-background/40">
                <summary className="cursor-pointer list-none px-3 py-2 text-xs text-muted-foreground transition-colors hover:text-foreground [&::-webkit-details-marker]:hidden">
                  ⚙️ Chi tiết kỹ thuật
                </summary>
                <div className="border-t border-border px-3 py-2">
                  <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-xs">
                    <dt className="text-muted-foreground">Kiểu MIME</dt>
                    <dd className="truncate text-right font-mono">{resource.mime ?? "—"}</dd>
                    <dt className="text-muted-foreground">Nhà cung cấp</dt>
                    <dd className="truncate text-right">{resource.provider ?? "—"}</dd>
                    <dt className="text-muted-foreground">Khóa lưu trữ</dt>
                    <dd className="truncate text-right font-mono">{resource.storage_key ?? "—"}</dd>
                    <dt className="text-muted-foreground">SHA-256</dt>
                    <dd className="truncate text-right font-mono">{resource.content_hash ?? "—"}</dd>
                    <dt className="text-muted-foreground">Phiên bản</dt>
                    <dd className="text-right">
                      {(resource.resource_files ?? [])
                        .map((file) => `v${file.version}`)
                        .join(", ")}
                    </dd>
                  </dl>
                </div>
              </details>
            )}
          </section>

          {/* Thẻ */}
          <section>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Thẻ (tags)
            </h2>
            <TagPicker
              resourceId={resource.id}
              allTags={(tags ?? []).map((tag) => ({ id: tag.id, name: tag.name }))}
              selectedIds={selectedTagIds}
            />
          </section>

          {/* Phiên bản */}
          <section>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Phiên bản tệp
            </h2>
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
          </section>

          {/* Chia sẻ */}
          <section>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Chia sẻ
            </h2>
            <SharePanel
              resourceId={resource.id}
              linkToken={shareInfo.linkToken}
              grants={shareInfo.grants}
            />
          </section>
        </ResourceSidePanel>
      </div>
    </div>
  );
}
