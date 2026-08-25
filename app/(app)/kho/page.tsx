import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";
import { DriveExplorer } from "@/components/explorer/drive-explorer";

export const metadata: Metadata = {
  title: "Kho của tôi",
  description: "Tổ chức tài liệu như trình quản lý tệp — chọn thư mục, kéo thả tệp để tải lên.",
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function parseId(value: string | string[] | undefined): string | null {
  if (typeof value !== "string" || !UUID_PATTERN.test(value)) return null;
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
  const folderId = parseId(params.f);

  const [foldersResult, resourcesResult] = await Promise.all([
    supabase
      .from("folders")
      .select("id, parent_id, name, path")
      .eq("owner_id", user.id)
      .is("deleted_at", null)
      .order("name", { ascending: true }),
    supabase
      .from("resources")
      .select(
        "id, folder_id, title, type, visibility, lifecycle_state, youtube_id, external_url, size_bytes, created_at",
      )
      .eq("owner_id", user.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: true }),
  ]);

  const folders = (foldersResult.data ?? []).map((f) => ({
    id: f.id,
    parentId: f.parent_id,
    name: f.name,
    path: f.path,
  }));

  const files = (resourcesResult.data ?? []).map((r) => ({
    id: r.id,
    folderId: r.folder_id,
    title: r.title,
    type: r.type,
    visibility: r.visibility,
    lifecycleState: r.lifecycle_state,
    youtubeId: r.youtube_id,
    externalUrl: r.external_url,
    sizeBytes: r.size_bytes,
    createdAt: r.created_at,
  }));

  const currentFolderExists = folders.some((f) => f.id === folderId);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8">
      <PageHeader
        title="Kho của tôi"
        description="Tổ chức tài liệu như trình quản lý tệp — chọn thư mục, kéo thả tệp để tải lên."
      />
      <DriveExplorer
        folders={folders}
        files={files}
        initialFolderId={
          folderId && currentFolderExists ? folderId : null
        }
      />
    </div>
  );
}
