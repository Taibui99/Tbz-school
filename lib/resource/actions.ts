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

async function getFolderOwned(
  supabase: SupabaseClient,
  userId: string,
  folderId: string | null,
): Promise<boolean> {
  if (!folderId) return true;
  const { data } = await supabase
    .from("folders")
    .select("id")
    .eq("id", folderId)
    .eq("owner_id", userId)
    .is("deleted_at", null)
    .maybeSingle();
  return Boolean(data);
}

function revalidateResource(id?: string | null) {
  revalidatePath("/kho");
  if (id) revalidatePath(`/tai-lieu/${id}`);
}

// ---------- Create ----------

export async function createResourceAction(
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const folderId = String(formData.get("folderId") ?? "") || null;
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
  if (!(await getFolderOwned(supabase, userId, folderId))) {
    return { error: "Thư mục đích không hợp lệ." };
  }

  const isExternal = type === "url";
  const isYoutubeVideo = type === "video" && youtubeUrl.trim().length > 0;
  const { data, error } = await supabase
    .from("resources")
    .insert({
      owner_id: userId,
      folder_id: folderId,
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

  revalidatePath("/kho");
  redirect(`/tai-lieu/${data.id}`);
}

// ---------- Update ----------

export async function updateResourceAction(
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const id = String(formData.get("id") ?? "");
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
  const userId = await requireUser(supabase);
  if (!userId) return { error: "Chưa đăng nhập." };

  const isYoutubeVideo = type === "video" && youtubeUrl.trim().length > 0;
  const { error } = await supabase
    .from("resources")
    .update({
      title: title.trim(),
      description: description.trim() || null,
      visibility,
      youtube_id: isYoutubeVideo ? youtubeIdFromUrl(youtubeUrl) : null,
    })
    .eq("id", id)
    .eq("owner_id", userId);
  if (error) return { error: error.message };

  revalidateResource(id);
  return { success: "Đã lưu tài liệu." };
}

// ---------- Soft delete / restore ----------

export async function deleteResourceAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");

  const supabase = await createClient();
  const userId = await requireUser(supabase);
  if (!userId) return { error: "Chưa đăng nhập." };

  const { error } = await supabase
    .from("resources")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .eq("owner_id", userId);
  if (error) return { error: error.message };

  revalidateResource(id);
  revalidatePath("/thung-rac");
  return { success: "Đã xóa tài liệu (vào thùng rác)." };
}

export async function restoreResourceAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");

  const supabase = await createClient();
  const userId = await requireUser(supabase);
  if (!userId) return { error: "Chưa đăng nhập." };

  const { error } = await supabase
    .from("resources")
    .update({ deleted_at: null })
    .eq("id", id)
    .eq("owner_id", userId);
  if (error) return { error: error.message };

  revalidateResource(id);
  revalidatePath("/thung-rac");
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
  const userId = await requireUser(supabase);
  if (!userId) return { error: "Chưa đăng nhập." };

  // Verify user owns the resource
  const { data: resource } = await supabase
    .from("resources")
    .select("id")
    .eq("id", resourceId)
    .eq("owner_id", userId)
    .maybeSingle();
  if (!resource) return { error: "Không tìm thấy tài liệu hoặc không có quyền." };

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
    .select("id, folder_id")
    .eq("id", resourceId)
    .maybeSingle();
  if (!resource) return;

  await supabase.from("activity_logs").insert({
    user_id: userId,
    resource_id: resource.id,
    action: "open",
    metadata: { folder_id: resource.folder_id },
  });
}

export async function copyResourceAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");

  const supabase = await createClient();
  const userId = await requireUser(supabase);
  if (!userId) return { error: "Chưa đăng nhập." };

  const { data: src } = await supabase
    .from("resources")
    .select(
      "id, title, description, type, visibility, lifecycle_state, provider, external_url, youtube_id, folder_id",
    )
    .eq("id", id)
    .maybeSingle();
  if (!src) return { error: "Tài liệu không tồn tại." };

  const isExternal = src.type === "url" || src.provider === "external";
  const isYoutubeVideo = src.type === "video" && !!src.youtube_id;
  const { data: copy, error } = await supabase
    .from("resources")
    .insert({
      owner_id: userId,
      folder_id: src.folder_id,
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

  revalidatePath("/kho");
  redirect(`/tai-lieu/${copy.id}`);
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

  revalidatePath("/kho");
  revalidatePath("/thung-rac");
  return { success: `Đã xóa ${ids.length} tài liệu (vào thùng rác).` };
}

export async function bulkMoveResourceAction(formData: FormData) {
  const ids = formData.getAll("id").map((v) => String(v)).filter(Boolean);
  const targetFolderId = String(formData.get("targetFolderId") ?? "") || null;
  if (ids.length === 0) return { error: "Chưa chọn tài liệu nào." };

  const supabase = await createClient();
  const userId = await requireUser(supabase);
  if (!userId) return { error: "Chưa đăng nhập." };
  if (!(await getFolderOwned(supabase, userId, targetFolderId))) {
    return { error: "Thư mục đích không hợp lệ." };
  }

  const { data: owned } = await supabase
    .from("resources")
    .select("id")
    .eq("owner_id", userId)
    .in("id", ids);
  if (!owned || owned.length !== ids.length) {
    return { error: "Không có quyền di chuyển một số tài liệu." };
  }

  const { error } = await supabase
    .from("resources")
    .update({ folder_id: targetFolderId })
    .eq("owner_id", userId)
    .in("id", ids);
  if (error) return { error: error.message };

  revalidatePath("/kho");
  return { success: `Đã di chuyển ${ids.length} tài liệu.` };
}

export type { ActionResult };
