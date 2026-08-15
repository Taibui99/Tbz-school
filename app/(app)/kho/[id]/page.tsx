import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Clock3, FolderTree } from "lucide-react";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { TypeIcon } from "@/components/resource/type-icon";
import {
  CreateCollectionDialog,
  DeleteCollectionDialog,
  EditCollectionDialog,
  MoveButtons,
} from "@/components/workspace/collection-dialogs";
import {
  DeleteWorkspaceDialog,
  EditWorkspaceDialog,
} from "@/components/workspace/workspace-dialogs";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Workspace",
  description: "Quản lý bộ sưu tập trong workspace.",
};

export default async function WorkspaceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/dang-nhap");

  const { data: workspace } = await supabase
    .from("workspaces")
    .select("id, name, description")
    .eq("id", id)
    .maybeSingle();
  if (!workspace) notFound();

  const { data: collections } = await supabase
    .from("collections")
    .select("id, name, description, position, lessons(count)")
    .eq("workspace_id", id)
    .order("position", { ascending: true });

  const totalLessons = (collections ?? []).reduce(
    (sum, collection) => sum + (collection.lessons?.[0]?.count ?? 0),
    0,
  );

  const { data: recentOpens } = await supabase
    .from("activity_logs")
    .select("resource_id, created_at, metadata, resources(title, type, deleted_at)")
    .eq("user_id", user.id)
    .eq("action", "open")
    .order("created_at", { ascending: false })
    .limit(8);

  const seen = new Set<string>();
  const recentResources = (recentOpens ?? [])
    .filter((entry) => {
      const resource = Array.isArray(entry.resources)
        ? entry.resources[0]
        : entry.resources;
      if (!resource || resource.deleted_at !== null) return false;
      if (seen.has(entry.resource_id)) return false;
      seen.add(entry.resource_id);
      return true;
    })
    .map((entry) => ({
      ...entry,
      resource: Array.isArray(entry.resources)
        ? entry.resources[0]!
        : entry.resources,
      meta: (entry.metadata ?? {}) as {
        workspace_id?: string;
        collection_id?: string;
        lesson_id?: string;
      },
    }))
    .filter((entry) => entry.meta.workspace_id === id)
    .slice(0, 5);

  return (
    <div className="px-4 py-8">
      <Breadcrumbs
        items={[{ href: "/kho", label: "Kho của tôi" }, { label: workspace.name }]}
      />

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {workspace.name}
          </h1>
          {workspace.description && (
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">
              {workspace.description}
            </p>
          )}
          <p className="mt-2 text-xs text-muted-foreground">
            {collections?.length ?? 0} bộ sưu tập · {totalLessons} bài học
          </p>
        </div>
        <div className="flex items-center gap-2">
          <CreateCollectionDialog workspaceId={id} />
          <EditWorkspaceDialog
            workspace={{ id: workspace.id, name: workspace.name, description: workspace.description }}
          />
          <DeleteWorkspaceDialog
            workspace={{ id: workspace.id, name: workspace.name, description: workspace.description }}
            description="Toàn bộ bộ sưu tập, bài học và tài liệu bên trong sẽ bị xóa vĩnh viễn. Hành động này không thể hoàn tác."
          />
        </div>
      </div>

      {recentResources.length > 0 && (
        <section className="mt-8">
          <h2 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Clock3 aria-hidden="true" className="size-4" />
            Đã mở gần đây
          </h2>
          <ul className="mt-3 flex flex-col gap-2">
            {recentResources.map((entry) => (
              <li key={entry.resource_id}>
                <Link
                  href={`/kho/${id}/${entry.meta.collection_id}/${entry.meta.lesson_id}/${entry.resource_id}`}
                  className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-2.5 text-sm transition-colors hover:border-primary/40"
                >
                  <TypeIcon type={entry.resource.type} className="size-4 shrink-0 text-muted-foreground" />
                  <span className="truncate font-medium">{entry.resource.title}</span>
                  <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                    {new Intl.DateTimeFormat("vi-VN", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    }).format(new Date(entry.created_at))}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {!collections || collections.length === 0 ? (
        <div className="mt-10 flex flex-col items-center gap-4 rounded-xl border border-dashed border-border py-16 text-center">
          <FolderTree className="size-10 text-muted-foreground" aria-hidden="true" />
          <div>
            <p className="font-medium">Chưa có bộ sưu tập</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Tạo bộ sưu tập đầu tiên để nhóm các bài học theo môn hoặc chủ đề.
            </p>
          </div>
          <CreateCollectionDialog workspaceId={id} />
        </div>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {collections.map((collection, index) => (
            <article
              key={collection.id}
              className="group flex flex-col gap-3 rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/40"
            >
              <Link href={`/kho/${id}/${collection.id}`} className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <FolderTree
                    className="size-5 text-muted-foreground group-hover:text-primary"
                    aria-hidden="true"
                  />
                  <span className="truncate font-medium">{collection.name}</span>
                </div>
                <p className="line-clamp-2 min-h-10 text-sm text-muted-foreground">
                  {collection.description || "Chưa có mô tả."}
                </p>
              </Link>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {collection.lessons?.[0]?.count ?? 0} bài học
                </span>
                <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <MoveButtons
                    id={collection.id}
                    workspaceId={id}
                    isFirst={index === 0}
                    isLast={index === (collections?.length ?? 0) - 1}
                  />
                  <EditCollectionDialog
                    workspaceId={id}
                    collection={{
                      id: collection.id,
                      name: collection.name,
                      description: collection.description,
                    }}
                  />
                  <DeleteCollectionDialog
                    workspaceId={id}
                    collection={{
                      id: collection.id,
                      name: collection.name,
                      description: collection.description,
                    }}
                    description="Các bài học và tài liệu bên trong bộ sưu tập này sẽ bị xóa vĩnh viễn."
                  />
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}