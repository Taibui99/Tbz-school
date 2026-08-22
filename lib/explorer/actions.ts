"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

export type ExplorerActionResult = {
  error?: string;
  id?: string;
  name?: string;
};

async function requireUser(
  supabase: SupabaseClient,
): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

function revalidateExplorer(workspaceId?: string) {
  revalidatePath("/kho");
  if (workspaceId) revalidatePath(`/kho/${workspaceId}`);
}

function validateName(name: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) return "Tên không được để trống.";
  if (trimmed.length > 100) return "Tên tối đa 100 ký tự.";
  return null;
}

// ---------- Create ----------

export async function createCollectionNodeAction(
  formData: FormData,
): Promise<ExplorerActionResult> {
  const workspaceId = String(formData.get("workspaceId") ?? "");

  const supabase = await createClient();
  if (!(await requireUser(supabase))) return { error: "Chưa đăng nhập." };

  const { data: maxRow } = await supabase
    .from("collections")
    .select("position")
    .eq("workspace_id", workspaceId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data, error } = await supabase
    .from("collections")
    .insert({
      workspace_id: workspaceId,
      name: "Bộ sưu tập mới",
      description: "",
      position: (maxRow?.position ?? -1) + 1,
    })
    .select("id")
    .single();
  if (error) return { error: error.message };

  revalidateExplorer(workspaceId);
  return { id: data.id, name: "Bộ sưu tập mới" };
}

export async function createLessonNodeAction(
  formData: FormData,
): Promise<ExplorerActionResult> {
  const collectionId = String(formData.get("collectionId") ?? "");
  const workspaceId = String(formData.get("workspaceId") ?? "");

  const supabase = await createClient();
  if (!(await requireUser(supabase))) return { error: "Chưa đăng nhập." };

  const { data: maxRow } = await supabase
    .from("lessons")
    .select("position")
    .eq("collection_id", collectionId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data, error } = await supabase
    .from("lessons")
    .insert({
      collection_id: collectionId,
      name: "Bài học mới",
      description: "",
      position: (maxRow?.position ?? -1) + 1,
    })
    .select("id")
    .single();
  if (error) return { error: error.message };

  revalidateExplorer(workspaceId);
  return { id: data.id, name: "Bài học mới" };
}

// ---------- Rename ----------

export async function renameCollectionNodeAction(
  formData: FormData,
): Promise<ExplorerActionResult> {
  const id = String(formData.get("id") ?? "");
  const workspaceId = String(formData.get("workspaceId") ?? "");
  const name = String(formData.get("name") ?? "");

  const nameError = validateName(name);
  if (nameError) return { error: nameError };

  const supabase = await createClient();
  if (!(await requireUser(supabase))) return { error: "Chưa đăng nhập." };

  const { error } = await supabase
    .from("collections")
    .update({ name: name.trim() })
    .eq("id", id);
  if (error) return { error: error.message };

  revalidateExplorer(workspaceId);
  return { id, name: name.trim() };
}

export async function renameLessonNodeAction(
  formData: FormData,
): Promise<ExplorerActionResult> {
  const id = String(formData.get("id") ?? "");
  const workspaceId = String(formData.get("workspaceId") ?? "");
  const name = String(formData.get("name") ?? "");

  const nameError = validateName(name);
  if (nameError) return { error: nameError };

  const supabase = await createClient();
  if (!(await requireUser(supabase))) return { error: "Chưa đăng nhập." };

  const { error } = await supabase
    .from("lessons")
    .update({ name: name.trim() })
    .eq("id", id);
  if (error) return { error: error.message };

  revalidateExplorer(workspaceId);
  return { id, name: name.trim() };
}

export async function renameWorkspaceNodeAction(
  formData: FormData,
): Promise<ExplorerActionResult> {
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "");

  const nameError = validateName(name);
  if (nameError) return { error: nameError };

  const supabase = await createClient();
  if (!(await requireUser(supabase))) return { error: "Chưa đăng nhập." };

  const { error } = await supabase
    .from("workspaces")
    .update({ name: name.trim() })
    .eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/kho");
  revalidatePath(`/kho/${id}`);
  return { id, name: name.trim() };
}

// ---------- Delete ----------

function revalidateAfterDelete(
  kind: "workspace" | "collection" | "lesson",
  workspaceId: string,
) {
  revalidatePath("/kho");
  if (kind !== "workspace") revalidatePath(`/kho/${workspaceId}`);
}

export async function deleteWorkspaceNodeAction(
  formData: FormData,
): Promise<ExplorerActionResult> {
  const id = String(formData.get("id") ?? "");

  const supabase = await createClient();
  if (!(await requireUser(supabase))) return { error: "Chưa đăng nhập." };

  const { error } = await supabase.from("workspaces").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/kho");
  return { id };
}

export async function deleteCollectionNodeAction(
  formData: FormData,
): Promise<ExplorerActionResult> {
  const id = String(formData.get("id") ?? "");
  const workspaceId = String(formData.get("workspaceId") ?? "");

  const supabase = await createClient();
  if (!(await requireUser(supabase))) return { error: "Chưa đăng nhập." };

  const { error } = await supabase.from("collections").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidateAfterDelete("collection", workspaceId);
  return { id };
}

export async function deleteLessonNodeAction(
  formData: FormData,
): Promise<ExplorerActionResult> {
  const id = String(formData.get("id") ?? "");
  const workspaceId = String(formData.get("workspaceId") ?? "");

  const supabase = await createClient();
  if (!(await requireUser(supabase))) return { error: "Chưa đăng nhập." };

  const { error } = await supabase.from("lessons").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidateAfterDelete("lesson", workspaceId);
  return { id };
}

// ---------- Resource ops (đổi tên / quyền xem) ----------

const MAX_RESOURCE_TITLE_LENGTH = 200;

function validateTitle(title: string): string | null {
  const trimmed = title.trim();
  if (!trimmed) return "Tiêu đề không được để trống.";
  if (trimmed.length > MAX_RESOURCE_TITLE_LENGTH) {
    return `Tiêu đề tối đa ${MAX_RESOURCE_TITLE_LENGTH} ký tự.`;
  }
  return null;
}

function isVisibilityValue(value: string): boolean {
  return ["private", "unlisted", "public"].includes(value);
}

export async function renameResourceNodeAction(
  formData: FormData,
): Promise<ExplorerActionResult> {
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "");

  const titleError = validateTitle(name);
  if (titleError) return { error: titleError };

  const supabase = await createClient();
  if (!(await requireUser(supabase))) return { error: "Chưa đăng nhập." };

  const { error } = await supabase
    .from("resources")
    .update({ title: name.trim() })
    .eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/kho");
  return { id, name: name.trim() };
}

export async function setResourceVisibilityAction(
  formData: FormData,
): Promise<ExplorerActionResult> {
  const id = String(formData.get("id") ?? "");
  const visibility = String(formData.get("visibility") ?? "");

  if (!isVisibilityValue(visibility)) {
    return { error: "Chế độ hiển thị không hợp lệ." };
  }

  const supabase = await createClient();
  if (!(await requireUser(supabase))) return { error: "Chưa đăng nhập." };

  const { error } = await supabase
    .from("resources")
    .update({ visibility })
    .eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/kho");
  revalidatePath("/kham-pha");
  return { id };
}

// ---------- Move folder ----------

async function ownedWorkspaceId(
  supabase: SupabaseClient,
  userId: string,
  workspaceId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("workspaces")
    .select("id")
    .eq("id", workspaceId)
    .eq("owner_id", userId)
    .maybeSingle();
  return Boolean(data);
}

export async function moveCollectionNodeAction(
  formData: FormData,
): Promise<ExplorerActionResult> {
  const collectionId = String(formData.get("collectionId") ?? "");
  const targetWorkspaceId = String(formData.get("targetWorkspaceId") ?? "");

  const supabase = await createClient();
  const userId = await requireUser(supabase);
  if (!userId) return { error: "Chưa đăng nhập." };

  if (!(await ownedWorkspaceId(supabase, userId, targetWorkspaceId))) {
    return { error: "Workspace đích không thuộc về bạn." };
  }

  const { data: collection } = await supabase
    .from("collections")
    .select("workspace_id")
    .eq("id", collectionId)
    .maybeSingle();
  if (!collection) return { error: "Không tìm thấy bộ sưu tập." };
  if (!(await ownedWorkspaceId(supabase, userId, collection.workspace_id))) {
    return { error: "Bạn không có quyền di chuyển bộ sưu tập này." };
  }
  if (collection.workspace_id === targetWorkspaceId) {
    return { id: collectionId };
  }

  const { data: maxRow } = await supabase
    .from("collections")
    .select("position")
    .eq("workspace_id", targetWorkspaceId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase
    .from("collections")
    .update({
      workspace_id: targetWorkspaceId,
      position: (maxRow?.position ?? -1) + 1,
    })
    .eq("id", collectionId);
  if (error) return { error: error.message };

  revalidatePath("/kho");
  return { id: collectionId };
}

export async function moveLessonNodeAction(
  formData: FormData,
): Promise<ExplorerActionResult> {
  const lessonId = String(formData.get("lessonId") ?? "");
  const targetCollectionId = String(formData.get("targetCollectionId") ?? "");

  const supabase = await createClient();
  const userId = await requireUser(supabase);
  if (!userId) return { error: "Chưa đăng nhập." };

  const { data: targetCollection } = await supabase
    .from("collections")
    .select("id, workspace_id")
    .eq("id", targetCollectionId)
    .maybeSingle();
  if (!targetCollection) {
    return { error: "Không tìm thấy bộ sưu tập đích." };
  }
  if (!(await ownedWorkspaceId(supabase, userId, targetCollection.workspace_id))) {
    return { error: "Bộ sưu tập đích không thuộc về bạn." };
  }

  const { data: lesson } = await supabase
    .from("lessons")
    .select("collection_id")
    .eq("id", lessonId)
    .maybeSingle();
  if (!lesson) return { error: "Không tìm thấy bài học." };
  if (lesson.collection_id === targetCollectionId) {
    return { id: lessonId };
  }

  const { data: maxRow } = await supabase
    .from("lessons")
    .select("position")
    .eq("collection_id", targetCollectionId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase
    .from("lessons")
    .update({
      collection_id: targetCollectionId,
      position: (maxRow?.position ?? -1) + 1,
    })
    .eq("id", lessonId);
  if (error) return { error: error.message };

  revalidatePath("/kho");
  return { id: lessonId };
}
