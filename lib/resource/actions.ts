"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  validateResourceForm,
  validateTags,
  youtubeIdFromUrl,
} from "@/lib/resource/validate";
import type { ActionResult } from "@/lib/workspace/actions";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

async function requireUser(
  supabase: SupabaseClient,
): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

async function getLessonContext(
  supabase: SupabaseClient,
  lessonId: string,
  workspaceId: string,
) {
  const { data } = await supabase
    .from("lessons")
    .select("id, collection_id, collections!inner(workspace_id)")
    .eq("id", lessonId)
    .eq("collections.workspace_id", workspaceId)
    .maybeSingle();
  if (!data) return null;
  return {
    lessonId: data.id,
    collectionId: data.collection_id,
  };
}

function revalidateLesson(workspaceId: string, collectionId: string, lessonId: string) {
  revalidatePath(`/kho/${workspaceId}/${collectionId}/${lessonId}`);
}

// ---------- Create ----------

export async function createResourceAction(
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const workspaceId = String(formData.get("workspaceId") ?? "");
  const lessonId = String(formData.get("lessonId") ?? "");
  const title = String(formData.get("title") ?? "");
  const description = String(formData.get("description") ?? "");
  const type = String(formData.get("type") ?? "");
  const visibility = String(formData.get("visibility") ?? "");
  const url = String(formData.get("url") ?? "");
  const youtubeUrl = String(formData.get("youtubeUrl") ?? "");

  const fieldErrors = validateResourceForm({
    title,
    description,
    type,
    visibility,
    url,
    youtubeUrl,
  });
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  const supabase = await createClient();
  const userId = await requireUser(supabase);
  if (!userId) return { error: "Chưa đăng nhập." };

  const lesson = await getLessonContext(supabase, lessonId, workspaceId);
  if (!lesson) return { error: "Bài học không thuộc workspace." };

  const isExternal = type === "url";
  const isYoutubeVideo = type === "video" && youtubeUrl.trim().length > 0;
  const { data, error } = await supabase
    .from("resources")
    .insert({
      owner_id: userId,
      workspace_id: workspaceId,
      lesson_id: lessonId,
      title: title.trim(),
      description: description.trim() || null,
      type,
      visibility,
      lifecycle_state: isExternal || isYoutubeVideo ? "ready" : "draft",
      provider: isExternal ? "external" : null,
      external_url: isExternal ? url.trim() : null,
      youtube_id: isYoutubeVideo ? youtubeIdFromUrl(youtubeUrl) : null,
    })
    .select("id")
    .single();
  if (error) return { error: error.message };

  if (isExternal) {
    const { error: externalError } = await supabase
      .from("external_resources")
      .insert({ resource_id: data.id, url: url.trim() });
    if (externalError) return { error: externalError.message };
  }

  revalidateLesson(workspaceId, lesson.collectionId, lessonId);
  redirect(
    `/kho/${workspaceId}/${lesson.collectionId}/${lessonId}/${data.id}`,
  );
}

// ---------- Update ----------

export async function updateResourceAction(
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const id = String(formData.get("id") ?? "");
  const workspaceId = String(formData.get("workspaceId") ?? "");
  const collectionId = String(formData.get("collectionId") ?? "");
  const lessonId = String(formData.get("lessonId") ?? "");
  const title = String(formData.get("title") ?? "");
  const description = String(formData.get("description") ?? "");
  const type = String(formData.get("type") ?? "");
  const visibility = String(formData.get("visibility") ?? "");
  const youtubeUrl = String(formData.get("youtubeUrl") ?? "");

  const fieldErrors = validateResourceForm({
    title,
    description,
    type,
    visibility,
    youtubeUrl,
  });
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  const supabase = await createClient();
  if (!(await requireUser(supabase))) return { error: "Chưa đăng nhập." };

  const isYoutubeVideo = type === "video" && youtubeUrl.trim().length > 0;
  const { error } = await supabase
    .from("resources")
    .update({
      title: title.trim(),
      description: description.trim() || null,
      visibility,
      youtube_id: isYoutubeVideo ? youtubeIdFromUrl(youtubeUrl) : null,
    })
    .eq("id", id);
  if (error) return { error: error.message };

  revalidateLesson(workspaceId, collectionId, lessonId);
  return { success: "Đã lưu tài liệu." };
}

// ---------- Soft delete / restore ----------

export async function deleteResourceAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");

  const supabase = await createClient();
  if (!(await requireUser(supabase))) return { error: "Chưa đăng nhập." };

  const { error } = await supabase
    .from("resources")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { error: error.message };

  const { data } = await supabase
    .from("resources")
    .select("workspace_id, lesson_id, lessons!inner(collection_id)")
    .eq("id", id)
    .maybeSingle();
  if (data) {
    revalidatePath(
      `/kho/${data.workspace_id}/${data.lessons ? (Array.isArray(data.lessons) ? data.lessons[0] : data.lessons).collection_id : undefined}/${data.lesson_id}`,
    );
  }
  return { success: "Đã xóa tài liệu (vào thùng rác)." };
}

export async function restoreResourceAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");

  const supabase = await createClient();
  if (!(await requireUser(supabase))) return { error: "Chưa đăng nhập." };

  const { error } = await supabase
    .from("resources")
    .update({ deleted_at: null })
    .eq("id", id);
  if (error) return { error: error.message };

  const { data } = await supabase
    .from("resources")
    .select("workspace_id, lesson_id, lessons!inner(collection_id)")
    .eq("id", id)
    .maybeSingle();
  if (data) {
    revalidatePath(
      `/kho/${data.workspace_id}/${data.lessons ? (Array.isArray(data.lessons) ? data.lessons[0] : data.lessons).collection_id : undefined}/${data.lesson_id}`,
    );
  }
  return { success: "Đã khôi phục tài liệu." };
}

// ---------- Favorites ----------

export async function setFavoriteAction(formData: FormData) {
  const resourceId = String(formData.get("resourceId") ?? "");
  const favorite = String(formData.get("favorite") ?? "") === "true";

  const supabase = await createClient();
  const userId = await requireUser(supabase);
  if (!userId) return { error: "Chưa đăng nhập." };

  if (favorite) {
    const { error } = await supabase
      .from("favorites")
      .insert({ user_id: userId, resource_id: resourceId });
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase
      .from("favorites")
      .delete()
      .eq("user_id", userId)
      .eq("resource_id", resourceId);
    if (error) return { error: error.message };
  }

  return { success: favorite ? "Đã thêm vào yêu thích." : "Đã bỏ yêu thích." };
}

// ---------- Tags ----------

export async function setTagsAction(
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const resourceId = String(formData.get("resourceId") ?? "");
  const tagIds = formData
    .getAll("tagId")
    .map((value) => String(value).trim())
    .filter((value) => value.length > 0);

  const tagsError = validateTags(tagIds);
  if (tagsError) return { error: tagsError };

  const supabase = await createClient();
  if (!(await requireUser(supabase))) return { error: "Chưa đăng nhập." };

  const { data: allowedTags } = await supabase.from("tags").select("id");
  const allowedIds = new Set((allowedTags ?? []).map((tag) => tag.id));
  for (const id of tagIds) {
    if (!allowedIds.has(id)) return { error: "Thẻ không hợp lệ." };
  }

  const { error: deleteError } = await supabase
    .from("resource_tags")
    .delete()
    .eq("resource_id", resourceId);
  if (deleteError) return { error: deleteError.message };

  if (tagIds.length > 0) {
    const { error: insertError } = await supabase
      .from("resource_tags")
      .insert(tagIds.map((tagId) => ({ resource_id: resourceId, tag_id: tagId })));
    if (insertError) return { error: insertError.message };
  }

  return { success: "Đã lưu thẻ." };
}

// ---------- Recently opened ----------

export async function recordOpenAction(resourceId: string) {
  const supabase = await createClient();
  const userId = await requireUser(supabase);
  if (!userId) return;

  const { data: resource } = await supabase
    .from("resources")
    .select("id, workspace_id, lesson_id, lessons!inner(collection_id)")
    .eq("id", resourceId)
    .maybeSingle();
  if (!resource) return;

  await supabase.from("activity_logs").insert({
    user_id: userId,
    resource_id: resource.id,
    action: "open",
    metadata: {
      workspace_id: resource.workspace_id,
      collection_id: resource.lessons ? (Array.isArray(resource.lessons) ? resource.lessons[0] : resource.lessons).collection_id : undefined,
      lesson_id: resource.lesson_id,
    },
  });
}

// ---------- Copy / bulk ----------

function lessonContextOf(row: { lessons: unknown }) {
  const lessons = row.lessons as
    | { collection_id?: string | null }[]
    | { collection_id?: string | null }
    | null;
  return Array.isArray(lessons)
    ? lessons[0]?.collection_id
    : lessons?.collection_id;
}

export async function copyResourceAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");

  const supabase = await createClient();
  const userId = await requireUser(supabase);
  if (!userId) return { error: "Chưa đăng nhập." };

  const { data: src } = await supabase
    .from("resources")
    .select(
      "id, title, description, type, visibility, lifecycle_state, provider, external_url, youtube_id, workspace_id, lesson_id, lessons!inner(collection_id)",
    )
    .eq("id", id)
    .maybeSingle();
  if (!src) return { error: "Tài liệu không tồn tại." };

  const collectionId = lessonContextOf(src);
  if (!src.workspace_id || !src.lesson_id || !collectionId) {
    return { error: "Thiếu ngữ cảnh tài liệu." };
  }

  const isExternal = src.type === "url" || src.provider === "external";
  const isYoutubeVideo = src.type === "video" && !!src.youtube_id;
  const { data: copy, error } = await supabase
    .from("resources")
    .insert({
      owner_id: userId,
      workspace_id: src.workspace_id,
      lesson_id: src.lesson_id,
      title: `${src.title} (bản sao)`,
      description: src.description,
      type: src.type,
      visibility: src.visibility,
      lifecycle_state: isExternal || isYoutubeVideo ? "ready" : "draft",
      provider: isExternal ? "external" : null,
      external_url: isExternal ? src.external_url : null,
      youtube_id: isYoutubeVideo ? src.youtube_id : null,
    })
    .select("id")
    .single();
  if (error) return { error: error.message };

  if (isExternal && src.external_url) {
    await supabase
      .from("external_resources")
      .insert({ resource_id: copy.id, url: src.external_url });
  }

  revalidateLesson(src.workspace_id, collectionId, src.lesson_id);
  redirect(
    `/kho/${src.workspace_id}/${collectionId}/${src.lesson_id}/${copy.id}`,
  );
}

export async function bulkDeleteResourceAction(formData: FormData) {
  const ids = formData.getAll("id").map((v) => String(v)).filter(Boolean);
  if (ids.length === 0) return { error: "Chưa chọn tài liệu nào." };

  const supabase = await createClient();
  const userId = await requireUser(supabase);
  if (!userId) return { error: "Chưa đăng nhập." };

  const { data: owned } = await supabase
    .from("resources")
    .select("id")
    .eq("owner_id", userId)
    .in("id", ids);
  if ((owned?.length ?? 0) !== ids.length) {
    return { error: "Không có quyền xóa một số tài liệu." };
  }

  const { error } = await supabase
    .from("resources")
    .update({ deleted_at: new Date().toISOString() })
    .in("id", ids);
  if (error) return { error: error.message };

  const { data: ctx } = await supabase
    .from("resources")
    .select("workspace_id, lesson_id, lessons!inner(collection_id)")
    .eq("id", ids[0])
    .maybeSingle();
  if (ctx) {
    const collectionId = lessonContextOf(ctx);
    if (ctx.workspace_id && ctx.lesson_id && collectionId) {
      revalidatePath(
        `/kho/${ctx.workspace_id}/${collectionId}/${ctx.lesson_id}`,
      );
    }
  }

  return { success: `Đã xóa ${ids.length} tài liệu (vào thùng rác).` };
}

export async function bulkMoveResourceAction(formData: FormData) {
  const ids = formData.getAll("id").map((v) => String(v)).filter(Boolean);
  const targetLessonId = String(formData.get("targetLessonId") ?? "");
  if (ids.length === 0) return { error: "Chưa chọn tài liệu nào." };

  const supabase = await createClient();
  const userId = await requireUser(supabase);
  if (!userId) return { error: "Chưa đăng nhập." };

  const { data: owned } = await supabase
    .from("resources")
    .select("id, workspace_id, lesson_id, lessons!inner(collection_id)")
    .eq("owner_id", userId)
    .in("id", ids);
  if (!owned || owned.length === 0) {
    return { error: "Không có tài liệu nào được chọn." };
  }
  if (owned.length !== ids.length) {
    return { error: "Không có quyền di chuyển một số tài liệu." };
  }

  const workspaceId = owned[0]?.workspace_id;
  if (!workspaceId) return { error: "Thiếu ngữ cảnh workspace." };
  const inSameWorkspace = owned.every(
    (row) => row.workspace_id === workspaceId,
  );
  if (!inSameWorkspace) {
    return { error: "Các tài liệu phải thuộc cùng một workspace." };
  }

  const target = await getLessonContext(supabase, targetLessonId, workspaceId);
  if (!target) {
    return { error: "Bài học đích không thuộc workspace này." };
  }

  const { error } = await supabase
    .from("resources")
    .update({ lesson_id: targetLessonId })
    .in("id", ids);
  if (error) return { error: error.message };

  const sourceIds = new Set(owned.map((row) => row.lesson_id));
  for (const sourceLessonId of sourceIds) {
    if (sourceLessonId === targetLessonId) continue;
    const source = owned.find((row) => row.lesson_id === sourceLessonId);
    if (!source) continue;
    const collectionId = lessonContextOf(source);
    if (collectionId) {
      revalidatePath(
        `/kho/${workspaceId}/${collectionId}/${sourceLessonId}`,
      );
    }
  }
  revalidatePath(`/kho/${workspaceId}/${target.collectionId}/${targetLessonId}`);

  return { success: `Đã di chuyển ${ids.length} tài liệu.` };
}

export type { ActionResult };
