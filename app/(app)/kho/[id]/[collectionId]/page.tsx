import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { BookOpen } from "lucide-react";
import { Breadcrumbs } from "@/components/breadcrumbs";
import {
  CreateLessonDialog,
  DeleteLessonDialog,
  EditLessonDialog,
  LessonMoveButtons,
} from "@/components/workspace/lesson-dialogs";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Bộ sưu tập",
  description: "Quản lý bài học trong bộ sưu tập.",
};

export default async function CollectionDetailPage({
  params,
}: {
  params: Promise<{ id: string; collectionId: string }>;
}) {
  const { id, collectionId } = await params;

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
    .select("id, name, description")
    .eq("id", collectionId)
    .maybeSingle();
  if (!collection) notFound();

  const { data: lessons } = await supabase
    .from("lessons")
    .select("id, name, description, position, resources(count)")
    .eq("collection_id", collectionId)
    .order("position", { ascending: true });

  return (
    <div className="px-4 py-8">
      <Breadcrumbs
        items={[
          { href: "/kho", label: "Kho của tôi" },
          { href: `/kho/${id}`, label: workspace.name },
          { label: collection.name },
        ]}
      />

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {collection.name}
          </h1>
          {collection.description && (
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">
              {collection.description}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <CreateLessonDialog workspaceId={id} collectionId={collectionId} />
          <EditLessonDialog workspaceId={id} lesson={collection} />
          <DeleteLessonDialog
            workspaceId={id}
            collectionId={collectionId}
            lesson={collection}
            description="Toàn bộ bài học và tài liệu bên trong bộ sưu tập này sẽ bị xóa vĩnh viễn."
          />
        </div>
      </div>

      {!lessons || lessons.length === 0 ? (
        <div className="mt-10 flex flex-col items-center gap-4 rounded-xl border border-dashed border-border py-16 text-center">
          <BookOpen className="size-10 text-muted-foreground" aria-hidden="true" />
          <div>
            <p className="font-medium">Chưa có bài học</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Tạo bài học đầu tiên để bắt đầu thêm tài liệu.
            </p>
          </div>
          <CreateLessonDialog workspaceId={id} collectionId={collectionId} />
        </div>
      ) : (
        <div className="mt-8 flex flex-col gap-3">
          {lessons.map((lesson, index) => (
            <article
              key={lesson.id}
              className="group flex items-center justify-between gap-4 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/40"
            >
              <Link
                href={`/kho/${id}/${collectionId}/${lesson.id}`}
                className="flex min-w-0 flex-1 items-center gap-3"
              >
                <BookOpen
                  className="size-5 shrink-0 text-muted-foreground group-hover:text-primary"
                  aria-hidden="true"
                />
                <div className="min-w-0">
                  <p className="truncate font-medium">{lesson.name}</p>
                  {lesson.description && (
                    <p className="truncate text-sm text-muted-foreground">
                      {lesson.description}
                    </p>
                  )}
                </div>
              </Link>
              <div className="flex shrink-0 items-center gap-3">
                <span className="text-xs text-muted-foreground">
                  {lesson.resources?.[0]?.count ?? 0} tài liệu
                </span>
                <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <LessonMoveButtons
                    id={lesson.id}
                    workspaceId={id}
                    collectionId={collectionId}
                    isFirst={index === 0}
                    isLast={index === (lessons?.length ?? 0) - 1}
                  />
                  <EditLessonDialog workspaceId={id} lesson={lesson} />
                  <DeleteLessonDialog
                    workspaceId={id}
                    collectionId={collectionId}
                    lesson={lesson}
                    description="Toàn bộ tài liệu bên trong bài học này sẽ bị xóa vĩnh viễn."
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