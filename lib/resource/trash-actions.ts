"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getActiveStorageProvider, isSupportedProvider } from "@/lib/storage";
import { StorageError } from "@/lib/storage/types";
import { shouldDeleteObject } from "@/lib/resource/trash";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

export type TrashActionResult = { success?: string; error?: string };

async function requireUser(
  supabase: SupabaseClient,
): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

async function deleteObjectIfUnreferenced(
  supabase: SupabaseClient,
  providerValue: string | null,
  key: string,
  resourceId: string,
) {
  if (!isSupportedProvider(providerValue)) return;
  const provider = getActiveStorageProvider();
  if (provider.name !== providerValue) return;

  const { count: resourceRefs } = await supabase
    .from("resources")
    .select("id", { count: "exact", head: true })
    .eq("storage_key", key)
    .neq("id", resourceId);
  const { count: fileRefs } = await supabase
    .from("resource_files")
    .select("id", { count: "exact", head: true })
    .eq("storage_key", key)
    .neq("resource_id", resourceId);

  if (shouldDeleteObject(resourceRefs ?? 0, fileRefs ?? 0)) {
    try {
      await provider.deleteObject(key);
    } catch (error) {
      const code = error instanceof StorageError ? error.code : "unknown";
      console.error(`Failed to delete storage object ${key} (${code})`);
    }
  }
}

async function permanentDeleteResource(
  supabase: SupabaseClient,
  userId: string,
  id: string,
): Promise<string | null> {
  const { data: resource } = await supabase
    .from("resources")
    .select("id, provider, storage_key, workspace_id, lesson_id")
    .eq("id", id)
    .eq("owner_id", userId)
    .not("deleted_at", "is", null)
    .maybeSingle();
  if (!resource) return "Tài liệu không tồn tại trong thùng rác.";

  const { data: files } = await supabase
    .from("resource_files")
    .select("storage_key")
    .eq("resource_id", id);

  const keys = new Set<string>();
  if (resource.storage_key) keys.add(resource.storage_key);
  for (const file of files ?? []) {
    if (file.storage_key) keys.add(file.storage_key);
  }
  for (const key of keys) {
    await deleteObjectIfUnreferenced(supabase, resource.provider, key, id);
  }

  const { error } = await supabase
    .from("resources")
    .delete()
    .eq("id", id)
    .eq("owner_id", userId);
  if (error) return "Không xóa được tài liệu.";

  revalidatePath("/kho", "layout");
  revalidatePath("/thung-rac");
  return null;
}

export async function permanentDeleteResourceAction(
  formData: FormData,
): Promise<TrashActionResult> {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { error: "Thiếu mã tài liệu." };

  const supabase = await createClient();
  const userId = await requireUser(supabase);
  if (!userId) return { error: "Chưa đăng nhập." };

  const error = await permanentDeleteResource(supabase, userId, id);
  if (error) return { error };
  return { success: "Đã xóa vĩnh viễn." };
}

export async function emptyTrashAction(
  _prev: TrashActionResult,
  _formData: FormData,
): Promise<TrashActionResult> {
  const supabase = await createClient();
  const userId = await requireUser(supabase);
  if (!userId) return { error: "Chưa đăng nhập." };

  const { data: resources } = await supabase
    .from("resources")
    .select("id")
    .eq("owner_id", userId)
    .not("deleted_at", "is", null);

  let deleted = 0;
  for (const resource of resources ?? []) {
    const error = await permanentDeleteResource(supabase, userId, resource.id);
    if (!error) deleted += 1;
  }

  revalidatePath("/thung-rac");
  revalidatePath("/kho", "layout");
  return { success: `Đã xóa vĩnh viễn ${deleted} tài liệu.` };
}