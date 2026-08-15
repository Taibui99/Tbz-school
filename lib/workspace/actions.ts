"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { validateFormFields } from "@/lib/workspace/validate";

export type ActionResult = {
  error?: string;
  success?: string;
  fieldErrors?: Record<string, string>;
};

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

async function requireUser(
  supabase: SupabaseClient,
): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

function readFormFields(formData: FormData) {
  return {
    name: String(formData.get("name") ?? ""),
    description: String(formData.get("description") ?? ""),
  };
}

function revalidateWorkspace(workspaceId: string) {
  revalidatePath(`/kho/${workspaceId}`);
  revalidatePath("/kho");
}

// ---------- Workspace ----------

export async function createWorkspaceAction(
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const { name, description } = readFormFields(formData);

  const fieldErrors = validateFormFields({ name, description });
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  const supabase = await createClient();
  const userId = await requireUser(supabase);
  if (!userId) return { error: "Chưa đăng nhập." };

  const { data, error } = await supabase
    .from("workspaces")
    .insert({ owner_id: userId, name: name.trim(), description: description.trim() })
    .select("id")
    .single();
  if (error) return { error: error.message };

  revalidatePath("/kho");
  redirect(`/kho/${data.id}`);
}

export async function updateWorkspaceAction(
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const id = String(formData.get("id") ?? "");
  const { name, description } = readFormFields(formData);

  const fieldErrors = validateFormFields({ name, description });
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  const supabase = await createClient();
  if (!(await requireUser(supabase))) return { error: "Chưa đăng nhập." };

  const { error } = await supabase
    .from("workspaces")
    .update({ name: name.trim(), description: description.trim() })
    .eq("id", id);
  if (error) return { error: error.message };

  revalidateWorkspace(id);
  return { success: "Đã lưu workspace." };
}

export async function deleteWorkspaceAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");

  const supabase = await createClient();
  if (!(await requireUser(supabase))) return { error: "Chưa đăng nhập." };

  const { error } = await supabase.from("workspaces").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/kho");
  redirect("/kho");
}

// ---------- Collection ----------

export async function createCollectionAction(
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const workspaceId = String(formData.get("workspaceId") ?? "");
  const { name, description } = readFormFields(formData);

  const fieldErrors = validateFormFields({ name, description });
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

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
      name: name.trim(),
      description: description.trim(),
      position: (maxRow?.position ?? -1) + 1,
    })
    .select("id")
    .single();
  if (error) return { error: error.message };

  revalidateWorkspace(workspaceId);
  redirect(`/kho/${workspaceId}/${data.id}`);
}

export async function updateCollectionAction(
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const id = String(formData.get("id") ?? "");
  const workspaceId = String(formData.get("workspaceId") ?? "");
  const { name, description } = readFormFields(formData);

  const fieldErrors = validateFormFields({ name, description });
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  const supabase = await createClient();
  if (!(await requireUser(supabase))) return { error: "Chưa đăng nhập." };

  const { error } = await supabase
    .from("collections")
    .update({ name: name.trim(), description: description.trim() })
    .eq("id", id);
  if (error) return { error: error.message };

  revalidateWorkspace(workspaceId);
  return { success: "Đã lưu bộ sưu tập." };
}

export async function deleteCollectionAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const workspaceId = String(formData.get("workspaceId") ?? "");

  const supabase = await createClient();
  if (!(await requireUser(supabase))) return { error: "Chưa đăng nhập." };

  const { error } = await supabase.from("collections").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidateWorkspace(workspaceId);
  redirect(`/kho/${workspaceId}`);
}

export async function moveCollectionAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const workspaceId = String(formData.get("workspaceId") ?? "");
  const direction = String(formData.get("direction") ?? "");

  const supabase = await createClient();
  if (!(await requireUser(supabase))) return { error: "Chưa đăng nhập." };

  const { data: siblings } = await supabase
    .from("collections")
    .select("id, position")
    .eq("workspace_id", workspaceId)
    .order("position", { ascending: true });
  if (!siblings) return { error: "Không tải được danh sách." };

  const index = siblings.findIndex((item) => item.id === id);
  const swapIndex =
    direction === "up" ? index - 1 : direction === "down" ? index + 1 : -1;
  if (index < 0 || swapIndex < 0 || swapIndex >= siblings.length) {
    return { error: "Không thể di chuyển." };
  }

  const current = siblings[index];
  const neighbor = siblings[swapIndex];

  const { error: errorA } = await supabase
    .from("collections")
    .update({ position: neighbor.position })
    .eq("id", current.id);
  if (errorA) return { error: errorA.message };
  const { error: errorB } = await supabase
    .from("collections")
    .update({ position: current.position })
    .eq("id", neighbor.id);
  if (errorB) return { error: errorB.message };

  revalidateWorkspace(workspaceId);
  return { success: "Đã sắp xếp lại." };
}

// ---------- Lesson ----------

export async function createLessonAction(
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const collectionId = String(formData.get("collectionId") ?? "");
  const workspaceId = String(formData.get("workspaceId") ?? "");
  const { name, description } = readFormFields(formData);

  const fieldErrors = validateFormFields({ name, description });
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

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
      name: name.trim(),
      description: description.trim(),
      position: (maxRow?.position ?? -1) + 1,
    })
    .select("id")
    .single();
  if (error) return { error: error.message };

  revalidateWorkspace(workspaceId);
  redirect(`/kho/${workspaceId}/${collectionId}/${data.id}`);
}

export async function updateLessonAction(
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const id = String(formData.get("id") ?? "");
  const workspaceId = String(formData.get("workspaceId") ?? "");
  const { name, description } = readFormFields(formData);

  const fieldErrors = validateFormFields({ name, description });
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  const supabase = await createClient();
  if (!(await requireUser(supabase))) return { error: "Chưa đăng nhập." };

  const { error } = await supabase
    .from("lessons")
    .update({ name: name.trim(), description: description.trim() })
    .eq("id", id);
  if (error) return { error: error.message };

  revalidateWorkspace(workspaceId);
  return { success: "Đã lưu bài học." };
}

export async function deleteLessonAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const collectionId = String(formData.get("collectionId") ?? "");
  const workspaceId = String(formData.get("workspaceId") ?? "");

  const supabase = await createClient();
  if (!(await requireUser(supabase))) return { error: "Chưa đăng nhập." };

  const { error } = await supabase.from("lessons").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidateWorkspace(workspaceId);
  redirect(`/kho/${workspaceId}/${collectionId}`);
}

export async function moveLessonAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const collectionId = String(formData.get("collectionId") ?? "");
  const workspaceId = String(formData.get("workspaceId") ?? "");
  const direction = String(formData.get("direction") ?? "");

  const supabase = await createClient();
  if (!(await requireUser(supabase))) return { error: "Chưa đăng nhập." };

  const { data: siblings } = await supabase
    .from("lessons")
    .select("id, position")
    .eq("collection_id", collectionId)
    .order("position", { ascending: true });
  if (!siblings) return { error: "Không tải được danh sách." };

  const index = siblings.findIndex((item) => item.id === id);
  const swapIndex =
    direction === "up" ? index - 1 : direction === "down" ? index + 1 : -1;
  if (index < 0 || swapIndex < 0 || swapIndex >= siblings.length) {
    return { error: "Không thể di chuyển." };
  }

  const current = siblings[index];
  const neighbor = siblings[swapIndex];

  const { error: errorA } = await supabase
    .from("lessons")
    .update({ position: neighbor.position })
    .eq("id", current.id);
  if (errorA) return { error: errorA.message };
  const { error: errorB } = await supabase
    .from("lessons")
    .update({ position: current.position })
    .eq("id", neighbor.id);
  if (errorB) return { error: errorB.message };

  revalidateWorkspace(workspaceId);
  return { success: "Đã sắp xếp lại." };
}

// ---------- Resource (move) ----------

export async function moveResourceAction(formData: FormData) {
  const resourceId = String(formData.get("resourceId") ?? "");
  const targetLessonId = String(formData.get("targetLessonId") ?? "");
  const workspaceId = String(formData.get("workspaceId") ?? "");

  const supabase = await createClient();
  if (!(await requireUser(supabase))) return { error: "Chưa đăng nhập." };

  const { data: resource } = await supabase
    .from("resources")
    .select("id, workspace_id, lesson_id")
    .eq("id", resourceId)
    .maybeSingle();
  if (!resource) return { error: "Tài liệu không tồn tại." };

  const { data: targetLesson } = await supabase
    .from("lessons")
    .select("collections!inner(workspaces!inner(workspace_id))")
    .eq("id", targetLessonId)
    .maybeSingle();
  if (!targetLesson) return { error: "Bài học đích không tồn tại." };

  const targetWorkspaceId =
    targetLesson.collections[0].workspaces[0].workspace_id;
  if (resource.workspace_id && resource.workspace_id !== targetWorkspaceId) {
    return { error: "Không thể di chuyển sang workspace khác." };
  }
  if (resource.lesson_id === targetLessonId) {
    return { error: "Tài liệu đã ở bài học này." };
  }

  const { error } = await supabase
    .from("resources")
    .update({ lesson_id: targetLessonId, workspace_id: targetWorkspaceId })
    .eq("id", resourceId);
  if (error) return { error: error.message };

  revalidateWorkspace(workspaceId);
  return { success: "Đã di chuyển tài liệu." };
}