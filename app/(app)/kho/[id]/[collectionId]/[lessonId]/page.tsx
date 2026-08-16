import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { createClient } from "@/lib/supabase/server";
import { CreateResourceDialog } from "@/components/resource/resource-dialogs";
import {
  ResourceList,
  type ResourceListItem,
} from "@/components/resource/resource-list";

export const metadata: Metadata = {
  title: "Bài học",
  description: "Tài liệu trong bài học.",
};

type ResourceRow = {
  id: string;
  title: string;
  description: string | null;
  type: string;
  visibility: string;
  lifecycle_state: string;
  external_url: string | null;
  deleted_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  resource_tags: {
    tag_id: string;
    tags: { id: string; name: string } | { id: string; name: string }[] | null;
  }[];
  favorites: { id: string }[];
};

function mapResource(row: ResourceRow): ResourceListItem {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    type: row.type,
    visibility: row.visibility,
    lifecycle_state: row.lifecycle_state,
    external_url: row.external_url,
    deleted_at: row.deleted_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
    tags: (row.resource_tags ?? []).map((item) => {
      const tag = Array.isArray(item.tags) ? item.tags[0] : item.tags;
      return tag
        ? { id: tag.id, name: tag.name }
        : { id: item.tag_id, name: item.tag_id };
    }),
    favorite: (row.favorites?.length ?? 0) > 0,
  };
}

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
      "id, title, description, type, visibility, lifecycle_state, external_url, deleted_at, created_at, updated_at, resource_tags(tag_id, tags(id, name)), favorites(id)",
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

      <ResourceList
        resources={activeResources.map(mapResource)}
        deletedResources={deletedResources.map(mapResource)}
        workspaceId={id}
        collectionId={collectionId}
        lessonId={lessonId}
        lessons={(lessonsInWorkspace ?? []).map((item) => ({
          id: item.id,
          name: item.name,
        }))}
      />
    </div>
  );
}