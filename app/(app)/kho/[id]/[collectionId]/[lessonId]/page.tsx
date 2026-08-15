import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { createClient } from "@/lib/supabase/server";
import { TypeIcon } from "@/components/resource/type-icon";
import { FavoriteButton } from "@/components/resource/favorite-button";
import { MoveResourceSelect } from "@/components/resource/move-resource-select";
import { RestoreButton } from "@/components/resource/restore-button";
import {
  CreateResourceDialog,
  DeleteResourceDialog,
  EditResourceDialog,
  TYPE_LABELS,
  VISIBILITY_LABELS,
} from "@/components/resource/resource-dialogs";
import type { ResourceType } from "@/lib/resource/validate";

export const metadata: Metadata = {
  title: "Bài học",
  description: "Tài liệu trong bài học.",
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

type ResourceRow = {
  id: string;
  title: string;
  description: string | null;
  type: string;
  visibility: string;
  lifecycle_state: string;
  external_url: string | null;
  deleted_at: string | null;
  resource_tags: {
    tag_id: string;
    tags: { id: string; name: string } | { id: string; name: string }[] | null;
  }[];
  favorites: { id: string }[];
};

export default async function LessonDetailPage({
  params,
}: {
  params: Promise<{ id: string; collectionId: string; lessonId: string }>;
}) {
  const { id, collectionId, lessonId } = await params;

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
    .select("id, name, description")
    .eq("id", lessonId)
    .maybeSingle();
  if (!lesson) notFound();

  const { data: resources } = await supabase
    .from("resources")
    .select(
      "id, title, description, type, visibility, lifecycle_state, external_url, deleted_at, resource_tags(tag_id, tags(id, name)), favorites(id)",
    )
    .eq("lesson_id", lessonId)
    .eq("favorites.user_id", user.id)
    .order("created_at", { ascending: true });

  const { data: lessonsInWorkspace } = await supabase
    .from("lessons")
    .select("id, name, collections(workspace_id)")
    .eq("collections.workspace_id", id)
    .order("name", { ascending: true });

  const activeResources = (resources ?? []).filter(
    (item) => item.deleted_at === null,
  );
  const deletedResources = (resources ?? []).filter(
    (item) => item.deleted_at !== null,
  );

  function ResourceCard({ resource }: { resource: ResourceRow }) {
    const isDeleted = resource.deleted_at !== null;
    const favorite = (resource.favorites?.length ?? 0) > 0;
    return (
      <li className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card p-4">
        <div className="flex min-w-0 items-center gap-3">
          <TypeIcon type={resource.type} className="size-5 shrink-0 text-muted-foreground" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/kho/${id}/${collectionId}/${lessonId}/${resource.id}`}
                className={`truncate font-medium hover:underline ${isDeleted ? "text-muted-foreground line-through" : ""}`}
              >
                {resource.title}
              </Link>
              {!isDeleted && (
                <FavoriteButton resourceId={resource.id} initialFavorite={favorite} />
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {TYPE_LABELS[resource.type] ?? resource.type} ·{" "}
              {VISIBILITY_LABELS[resource.visibility] ?? resource.visibility} ·{" "}
              {lifecycleLabel(resource.lifecycle_state)}
            </p>
            {(resource.resource_tags?.length ?? 0) > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1">
                {resource.resource_tags.map((item) => (
                  <span
                    key={item.tag_id}
                    className="rounded-full bg-accent px-2 py-0.5 text-xs text-muted-foreground"
                  >
                    {Array.isArray(item.tags) ? item.tags[0]?.name : item.tags?.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {!isDeleted && (
            <>
              <MoveResourceSelect
                resourceId={resource.id}
                workspaceId={id}
                currentLessonId={lessonId}
                lessons={(lessonsInWorkspace ?? []).map((item) => ({
                  id: item.id,
                  name: item.name,
                }))}
              />
              <EditResourceDialog
                resource={{
                  id: resource.id,
                  title: resource.title,
                  description: resource.description,
                  type: resource.type as ResourceType,
                  visibility: resource.visibility,
                  externalUrl: resource.external_url,
                }}
                workspaceId={id}
                collectionId={collectionId}
                lessonId={lessonId}
              />
              <DeleteResourceDialog resource={resource} />
            </>
          )}
          {isDeleted && <RestoreButton resourceId={resource.id} />}
        </div>
      </li>
    );
  }

  return (
    <div className="px-4 py-8">
      <Breadcrumbs
        items={[
          { href: "/kho", label: "Kho của tôi" },
          { href: `/kho/${id}`, label: workspace.name },
          { href: `/kho/${id}/${collectionId}`, label: collection.name },
          { label: lesson.name },
        ]}
      />

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{lesson.name}</h1>
          {lesson.description && (
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">
              {lesson.description}
            </p>
          )}
        </div>
        <CreateResourceDialog
          workspaceId={id}
          collectionId={collectionId}
          lessonId={lessonId}
        />
      </div>

      {activeResources.length === 0 ? (
        <div className="mt-10 flex flex-col items-center gap-4 rounded-xl border border-dashed border-border py-16 text-center">
          <TypeIcon type="pdf" className="size-10 text-muted-foreground" />
          <div>
            <p className="font-medium">Chưa có tài liệu</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Thêm liên kết ngoài ngay, hoặc tạo tài liệu để chuẩn bị tải tệp
              lên (giai đoạn tiếp theo).
            </p>
          </div>
        </div>
      ) : (
        <ul className="mt-8 flex flex-col gap-3">
          {activeResources.map((resource) => (
            <ResourceCard key={resource.id} resource={resource} />
          ))}
        </ul>
      )}

      {deletedResources.length > 0 && (
        <section className="mt-10">
          <h2 className="text-sm font-medium text-muted-foreground">
            Đã xóa ({deletedResources.length})
          </h2>
          <ul className="mt-3 flex flex-col gap-3">
            {deletedResources.map((resource) => (
              <ResourceCard key={resource.id} resource={resource} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}