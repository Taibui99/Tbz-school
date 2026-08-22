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
