import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { FolderTree } from "lucide-react";
import { Breadcrumbs } from "@/components/breadcrumbs";
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