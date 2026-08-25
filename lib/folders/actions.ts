"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isSubPath, pathJoin } from "@/lib/folders/tree";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

export type FolderActionResult = {
  error?: string;
  id?: string;
  name?: string;
};

function revalidateKho() {
  revalidatePath("/kho");
}

async function requireUser(
  supabase: SupabaseClient,
): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

function validateName(name: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) return "Tên không được để trống.";
  if (trimmed.length > 100) return "Tên tối đa 100 ký tự.";
  return null;
}

async function ownedFolder(
  supabase: SupabaseClient,
  userId: string,
  folderId: string | null,
) {
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

// ---------- Create ----------

export async function createFolderAction(
  formData: FormData,
): Promise<FolderActionResult> {
  const parentId = String(formData.get("parentId") ?? "") || null;
  const rawName = String(formData.get("name") ?? "").trim();
  const name = rawName || "Thư mục mới";

  const nameError = validateName(name);
  if (nameError) return { error: nameError };

  const supabase = await createClient();
  const userId = await requireUser(supabase);
  if (!userId) return { error: "Chưa đăng nhập." };
  if (!(await ownedFolder(supabase, userId, parentId))) {
    return { error: "Thư mục cha không hợp lệ." };
  }

  let parentPath = "/";
  if (parentId) {
    const { data: parent } = await supabase
      .from("folders")
      .select("path")
      .eq("id", parentId)
      .maybeSingle();
    parentPath = parent?.path ?? "/";
  }

  const { data: created, error } = await supabase
    .from("folders")
    .insert({ owner_id: userId, parent_id: parentId, name, path: "/" })
    .select("id")
    .single();
  if (error || !created) return { error: error?.message ?? "Không tạo được thư mục." };

  const path = pathJoin(parentPath, created.id);
  const { error: pathError } = await supabase
    .from("folders")
    .update({ path })
    .eq("id", created.id);
  if (pathError) return { error: pathError.message };

  revalidateKho();
  return { id: created.id, name };
}

// ---------- Rename ----------

export async function renameFolderAction(
  formData: FormData,
): Promise<FolderActionResult> {
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "");

  const nameError = validateName(name);
  if (nameError) return { error: nameError };

  const supabase = await createClient();
  const userId = await requireUser(supabase);
  if (!userId) return { error: "Chưa đăng nhập." };

  const { error } = await supabase
    .from("folders")
    .update({ name: name.trim() })
    .eq("id", id)
    .eq("owner_id", userId);
  if (error) return { error: error.message };

  revalidateKho();
  return { id, name: name.trim() };
}

// ---------- Move (chặn kéo cha vào con, dựng lại path cả cây con) ----------

export async function moveFolderAction(
  formData: FormData,
): Promise<FolderActionResult> {
  const id = String(formData.get("id") ?? "");
  const targetParentId = String(formData.get("targetParentId") ?? "") || null;

  const supabase = await createClient();
  const userId = await requireUser(supabase);
  if (!userId) return { error: "Chưa đăng nhập." };

  const { data: node } = await supabase
    .from("folders")
    .select("id, parent_id, path, owner_id")
    .eq("id", id)
    .maybeSingle();
  if (!node || node.owner_id !== userId) {
    return { error: "Không tìm thấy thư mục." };
  }
  if (!(await ownedFolder(supabase, userId, targetParentId))) {
    return { error: "Thư mục đích không hợp lệ." };
  }
  if (node.parent_id === targetParentId) return { id };

  let targetPath = "/";
  if (targetParentId) {
    const { data: target } = await supabase
      .from("folders")
      .select("path, deleted_at")
      .eq("id", targetParentId)
      .maybeSingle();
    if (!target || target.deleted_at !== null) {
      return { error: "Thư mục đích không khả dụng." };
    }
    if (isSubPath(target.path, node.path)) {
      return { error: "Không thể di chuyển vào chính nó hoặc thư mục con của nó." };
    }
    targetPath = target.path;
  }

  // Toàn bộ cây con theo materialized path
  const { data: subtree } = await supabase
    .from("folders")
    .select("id, path")
    .eq("owner_id", userId)
    .like("path", `${node.path}%`);
  const rows = subtree ?? [];

  const newPath = pathJoin(targetPath, id);
  for (const row of rows) {
    const updated =
      row.id === id ? newPath : `${newPath}${row.path.slice(node.path.length)}`;
    const { error } = await supabase
      .from("folders")
      .update({
        ...(row.id === id ? { parent_id: targetParentId } : {}),
        path: updated,
      })
      .eq("id", row.id)
      .eq("owner_id", userId);
    if (error) return { error: error.message };
  }

  revalidateKho();
  return { id };
}

// ---------- Trash / restore / purge ----------

export async function trashFolderAction(
  formData: FormData,
): Promise<{ error?: string; success?: string }> {
  const id = String(formData.get("id") ?? "");

  const supabase = await createClient();
  const userId = await requireUser(supabase);
  if (!userId) return { error: "Chưa đăng nhập." };

  const { error } = await supabase
    .from("folders")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .eq("owner_id", userId);
  if (error) return { error: error.message };

  revalidateKho();
  revalidatePath("/thung-rac");
  return { success: "Đã chuyển thư mục vào thùng rác." };
}

export async function restoreFolderAction(
  formData: FormData,
): Promise<{ error?: string; success?: string }> {
  const id = String(formData.get("id") ?? "");

  const supabase = await createClient();
  const userId = await requireUser(supabase);
  if (!userId) return { error: "Chưa đăng nhập." };

  const { data: node } = await supabase
    .from("folders")
    .select("id, parent_id, owner_id")
    .eq("id", id)
    .maybeSingle();
  if (!node || node.owner_id !== userId) {
    return { error: "Không tìm thấy thư mục." };
  }

  // Nếu cha cũng đang trong thùng rác → tách về gốc để thư mục hiển thị lại.
  let detach = false;
  let cursor = node.parent_id;
  while (cursor) {
    const { data: ancestor } = await supabase
      .from("folders")
      .select("parent_id, deleted_at")
      .eq("id", cursor)
      .maybeSingle();
    if (!ancestor) break;
    if (ancestor.deleted_at !== null) {
      detach = true;
      break;
    }
    cursor = ancestor.parent_id;
  }

  const updates: Record<string, unknown> = { deleted_at: null };
  if (detach) updates.parent_id = null;

  const { data: updated, error } = await supabase
    .from("folders")
    .update(updates)
    .eq("id", id)
    .eq("owner_id", userId)
    .select("id, parent_id")
    .single();
  if (error || !updated) return { error: error?.message ?? "Không khôi phục được." };

  if (detach) {
    // Dựng lại path cho chính nó và cây con.
    const newPath = pathJoin("/", id);
    await supabase.from("folders").update({ path: newPath }).eq("id", id);
    const { data: subtree } = await supabase
      .from("folders")
      .select("id, path")
      .neq("id", id)
      .like("path", `%/${id}/%`);
    for (const row of subtree ?? []) {
      const idx = row.path.indexOf(`/${id}/`);
      if (idx === -1) continue;
      const suffix = row.path.slice(idx + `/${id}/`.length);
      await supabase
        .from("folders")
        .update({ path: `${newPath}${suffix}` })
        .eq("id", row.id);
    }
  }

  revalidateKho();
  revalidatePath("/thung-rac");
  return { success: "Đã khôi phục thư mục." };
}

export async function purgeFolderAction(
  formData: FormData,
): Promise<{ error?: string; success?: string }> {
  const id = String(formData.get("id") ?? "");

  const supabase = await createClient();
  const userId = await requireUser(supabase);
  if (!userId) return { error: "Chưa đăng nhập." };

  const { data: node } = await supabase
    .from("folders")
    .select("id, path, owner_id")
    .eq("id", id)
    .maybeSingle();
  if (!node || node.owner_id !== userId) {
    return { error: "Không tìm thấy thư mục." };
  }

  // Tệp trong cây con chuyển thành "đã xóa" để có thể phục hồi riêng lẻ.
  const { data: subtree } = await supabase
    .from("folders")
    .select("id")
    .eq("owner_id", userId)
    .like("path", `${node.path}%`);
  const subtreeIds = (subtree ?? []).map((f) => f.id);

  const { error: filesError } = await supabase
    .from("resources")
    .update({ deleted_at: new Date().toISOString() })
    .eq("owner_id", userId)
    .is("deleted_at", null)
    .in("folder_id", subtreeIds);
  if (filesError) return { error: filesError.message };

  const { error } = await supabase
    .from("folders")
    .delete()
    .eq("id", id)
    .eq("owner_id", userId);
  if (error) return { error: error.message };

  revalidateKho();
  revalidatePath("/thung-rac");
  return { success: "Đã xóa vĩnh viễn thư mục." };
}

// ---------- Di chuyển tài liệu ----------

export async function setResourceFolderAction(
  formData: FormData,
): Promise<FolderActionResult> {
  const resourceId = String(formData.get("resourceId") ?? "");
  const targetFolderId = String(formData.get("targetFolderId") ?? "") || null;

  const supabase = await createClient();
  const userId = await requireUser(supabase);
  if (!userId) return { error: "Chưa đăng nhập." };
  if (!(await ownedFolder(supabase, userId, targetFolderId))) {
    return { error: "Thư mục đích không hợp lệ." };
  }

  const { error } = await supabase
    .from("resources")
    .update({ folder_id: targetFolderId })
    .eq("id", resourceId)
    .eq("owner_id", userId);
  if (error) return { error: error.message };

  revalidateKho();
  revalidatePath(`/tai-lieu/${resourceId}`);
  return { id: resourceId };
}
