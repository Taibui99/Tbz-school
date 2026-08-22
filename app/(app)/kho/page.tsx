import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";
import { KhoExplorer } from "@/components/explorer/kho-explorer";
import type {
  ExplorerCollection,
  ExplorerFile,
  ExplorerLesson,
  ExplorerSelection,
  ExplorerWorkspace,
} from "@/components/explorer/types";

export const metadata: Metadata = {
  title: "Kho của tôi",
  description: "Quản lý tài liệu học tập của bạn trên TBZ School.",
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function parseId(value: string | string[] | undefined): string | undefined {
  if (typeof value !== "string" || !UUID_PATTERN.test(value)) return undefined;
  return value;
}

export default async function KhoPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/dang-nhap");

  const params = await searchParams;
  const selection: ExplorerSelection = {
    w: parseId(params.w),
    c: parseId(params.c),
    l: parseId(params.l),
  };

  const [workspacesResult, collectionsResult, lessonsResult, resourcesResult] =
    await Promise.all([
      supabase
        .from("workspaces")
        .select("id, name")
        .order("created_at", { ascending: false }),
      supabase
        .from("collections")
        .select("id, workspace_id, name")
        .order("position", { ascending: true }),
      supabase
        .from("lessons")
        .select("id, collection_id, name")
        .order("position", { ascending: true }),
      supabase
        .from("resources")
        .select(
          "id, lesson_id, title, type, visibility, lifecycle_state, youtube_id, external_url",
        )
        .is("deleted_at", null)
        .order("created_at", { ascending: true }),
    ]);

  const tree: ExplorerWorkspace[] = (workspacesResult.data ?? []).map((ws) => ({
    kind: "workspace",
    id: ws.id,
    name: ws.name,
    collections: [],
  }));
  const workspaceById = new Map(tree.map((item) => [item.id, item]));

  const collectionById = new Map<string, ExplorerCollection>();
  for (const col of collectionsResult.data ?? []) {
    const parent = workspaceById.get(col.workspace_id);
    if (!parent) continue;
    const node: ExplorerCollection = {
      kind: "collection",
      id: col.id,
      workspaceId: parent.id,
      name: col.name,
      lessons: [],
    };
    parent.collections.push(node);
    collectionById.set(col.id, node);
  }

  const lessonById = new Map<string, ExplorerLesson>();
  for (const les of lessonsResult.data ?? []) {
    const parent = collectionById.get(les.collection_id);
    if (!parent) continue;
    const node: ExplorerLesson = {
      kind: "lesson",
      id: les.id,
      workspaceId: parent.workspaceId,
      collectionId: parent.id,
      name: les.name,
      files: [],
    };
    parent.lessons.push(node);
    lessonById.set(les.id, node);
  }

  for (const row of resourcesResult.data ?? []) {
    if (!row.lesson_id) continue;
    const parent = lessonById.get(row.lesson_id);
    if (!parent) continue;
    const file: ExplorerFile = {
      id: row.id,
      title: row.title,
      type: row.type,
      visibility: row.visibility,
      lifecycleState: row.lifecycle_state,
      youtubeId: row.youtube_id,
      externalUrl: row.external_url,
    };
    parent.files.push(file);
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8">
      <PageHeader
        title="Kho của tôi"
        description="Tổ chức tài liệu như trình quản lý tệp — chọn thư mục, kéo thả tệp để tải lên."
      />
      <KhoExplorer workspaces={tree} selection={selection} />
    </div>
  );
}
