"use server";

import { createClient } from "@/lib/supabase/server";

export interface ContinueContext {
  id: string;
  title: string;
  type: string;
  workspaceId: string | null;
  collectionId: string | null;
  lessonId: string | null;
}

/**
 * Trả về ngữ cảnh (path /kho/...) cho các tài liệu mà client đang
 * đọc từ localStorage (last page / last position). RLS trên resources
 * tự lọc — chỉ tài liệu người dùng có quyền truy cập mới được trả về.
 */
export async function getContinueContextAction(
  ids: string[],
): Promise<ContinueContext[]> {
  const cleanIds = Array.from(new Set(ids.filter((id) => typeof id === "string")));
  if (cleanIds.length === 0) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("resources")
    .select(
      "id, title, type, deleted_at, workspace_id, lesson_id, lessons(collection_id)",
    )
    .in("id", cleanIds);

  const rows = data ?? [];
  return rows
    .filter((row) => row.deleted_at === null)
    .map((row) => {
      const lessons = row.lessons as
        | { collection_id?: string | null }[]
        | { collection_id?: string | null }
        | null;
      const collectionId = Array.isArray(lessons)
        ? lessons[0]?.collection_id ?? null
        : lessons?.collection_id ?? null;
      return {
        id: row.id,
        title: row.title,
        type: row.type,
        workspaceId: row.workspace_id,
        collectionId,
        lessonId: row.lesson_id,
      };
    })
    .filter(
      (item) =>
        item.workspaceId && item.collectionId && item.lessonId,
    );
}