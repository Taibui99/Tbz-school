import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { FileText, MoveRight } from "lucide-react";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Button } from "@/components/ui/button";
import { moveResourceAction } from "@/lib/workspace/actions";
import { asVoidAction } from "@/lib/form-action";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Bài học",
  description: "Tài liệu trong bài học.",
};

const TYPE_LABELS: Record<string, string> = {
  pdf: "PDF",
  doc: "DOC",
  docx: "DOCX",
  ppt: "PPT",
  pptx: "PPTX",
  xls: "XLS",
  xlsx: "XLSX",
  image: "Hình ảnh",
  video: "Video",
  audio: "Âm thanh",
  text: "Văn bản",
  url: "Liên kết",
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
    .select("id, title, type, visibility, lifecycle_state, created_at")
    .eq("lesson_id", lessonId)
    .order("created_at", { ascending: true });

  const { data: lessonsInWorkspace } = await supabase
    .from("lessons")
    .select("id, name, collections(workspace_id)")
    .eq("collections.workspace_id", id)
    .order("name", { ascending: true });

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

      <div className="mt-4">
        <h1 className="text-2xl font-semibold tracking-tight">{lesson.name}</h1>
        {lesson.description && (
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            {lesson.description}
          </p>
        )}
      </div>

      {!resources || resources.length === 0 ? (
        <div className="mt-10 flex flex-col items-center gap-4 rounded-xl border border-dashed border-border py-16 text-center">
          <FileText className="size-10 text-muted-foreground" aria-hidden="true" />
          <div>
            <p className="font-medium">Chưa có tài liệu</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Tính năng tải tài liệu lên sẽ được bổ sung trong giai đoạn tiếp
              theo.
            </p>
          </div>
        </div>
      ) : (
        <ul className="mt-8 flex flex-col gap-3">
          {resources.map((resource) => (
            <li
              key={resource.id}
              className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card p-4"
            >
              <div className="flex min-w-0 items-center gap-3">
                <FileText className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
                <div className="min-w-0">
                  <p className="truncate font-medium">{resource.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {TYPE_LABELS[resource.type] ?? resource.type} ·{" "}
                    {resource.visibility === "public"
                      ? "Công khai"
                      : resource.visibility === "unlisted"
                        ? "Ẩn theo liên kết"
                        : resource.visibility === "shared"
                          ? "Chia sẻ"
                          : "Riêng tư"}{" "}
                    ·{" "}
                    {resource.lifecycle_state === "ready"
                      ? "Sẵn sàng"
                      : resource.lifecycle_state === "uploading"
                        ? "Đang tải lên"
                        : resource.lifecycle_state === "processing"
                          ? "Đang xử lý"
                          : resource.lifecycle_state === "failed"
                            ? "Lỗi"
                            : resource.lifecycle_state}
                  </p>
                </div>
              </div>

              {(lessonsInWorkspace?.length ?? 0) > 1 && (
                <form
                  action={asVoidAction(moveResourceAction)}
                  className="flex shrink-0 items-center gap-2"
                >
                  <input type="hidden" name="resourceId" value={resource.id} />
                  <input type="hidden" name="workspaceId" value={id} />
                  <MoveRight
                    className="size-4 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <label htmlFor={`move-${resource.id}`} className="sr-only">
                    Di chuyển tài liệu
                  </label>
                  <select
                    id={`move-${resource.id}`}
                    name="targetLessonId"
                    defaultValue=""
                    className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                    required
                  >
                    <option value="" disabled>
                      Di chuyển đến...
                    </option>
                    {lessonsInWorkspace
                      ?.filter((item) => item.id !== lessonId)
                      .map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                  </select>
                  <Button type="submit" variant="outline" size="sm">
                    Di chuyển
                  </Button>
                </form>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}