"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ActionResult } from "@/lib/workspace/actions";
import { checkRateLimit } from "@/lib/security/rate-limit";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

async function requireUser(
  supabase: SupabaseClient,
): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

function generateShareToken(): string {
  const a = crypto.randomUUID().replace(/-/g, "");
  const b = crypto.randomUUID().replace(/-/g, "");
  return (a + b).slice(0, 48);
}

async function assertOwner(
  supabase: SupabaseClient,
  resourceId: string,
): Promise<string | null> {
  const userId = await requireUser(supabase);
  if (!userId) return null;
  const { data } = await supabase
    .from("resources")
    .select("id")
    .eq("id", resourceId)
    .eq("owner_id", userId)
    .maybeSingle();
  if (!data) return null;
  return userId;
}

// ---------- Share link (unlisted) ----------

export async function ensureShareLinkAction(
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult & { token?: string }> {
  const resourceId = String(formData.get("resourceId") ?? "");
  const supabase = await createClient();
  const userId = await assertOwner(supabase, resourceId);
  if (!userId) return { error: "Bạn không sở hữu tài liệu này." };

  const rl = checkRateLimit(`share-link:${userId}`, 30, 60 * 60 * 1000);
  if (!rl.ok) {
    return {
      error: `Bạn tạo liên kết chia sẻ quá nhanh. Thử lại sau ${Math.ceil(rl.retryAfterSec / 60)} phút.`,
    };
  }

  const { data: existing } = await supabase
    .from("resource_shares")
    .select("token")
    .eq("resource_id", resourceId)
    .is("granted_to", null)
    .not("token", "is", null)
    .maybeSingle();
  if (existing?.token) {
    return { success: "Đã có liên kết chia sẻ.", token: existing.token };
  }

  const token = generateShareToken();
  const { error: insertError } = await supabase
    .from("resource_shares")
    .insert({
      resource_id: resourceId,
      shared_by: userId,
      granted_to: null,
      token,
      permission_level: "viewer",
    });
  if (insertError) return { error: insertError.message };

  const { error: updateError } = await supabase
    .from("resources")
    .update({ visibility: "unlisted" })
    .eq("id", resourceId)
    .eq("owner_id", userId);
  if (updateError) return { error: updateError.message };

  revalidatePath(`/kho`);
  revalidatePath(`/kho/[id]`);
  revalidatePath(`/kho/[id]/[collectionId]/[lessonId]`);
  revalidatePath(`/kho/[id]/[collectionId]/[lessonId]/[resourceId]`);
  return { success: "Đã tạo liên kết chia sẻ.", token };
}

export async function revokeShareLinkAction(formData: FormData) {
  const resourceId = String(formData.get("resourceId") ?? "");
  const supabase = await createClient();
  const userId = await assertOwner(supabase, resourceId);
  if (!userId) return { error: "Bạn không sở hữu tài liệu này." };

  const { error } = await supabase
    .from("resource_shares")
    .delete()
    .eq("resource_id", resourceId)
    .is("granted_to", null)
    .not("token", "is", null);
  if (error) return { error: error.message };

  revalidatePath(`/kho`);
  revalidatePath(`/kho/[id]`);
  revalidatePath(`/kho/[id]/[collectionId]/[lessonId]`);
  revalidatePath(`/kho/[id]/[collectionId]/[lessonId]/[resourceId]`);
  return { success: "Đã thu hồi liên kết chia sẻ." };
}

// ---------- Specific user grants (shared) ----------

export async function grantShareAction(
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const resourceId = String(formData.get("resourceId") ?? "");
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const permissionLevel = String(formData.get("permissionLevel") ?? "viewer");

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Email không hợp lệ." };
  }
  if (permissionLevel !== "viewer" && permissionLevel !== "editor") {
    return { error: "Quyền hạn không hợp lệ." };
  }

  const supabase = await createClient();
  const userId = await assertOwner(supabase, resourceId);
  if (!userId) return { error: "Bạn không sở hữu tài liệu này." };

  const rl = checkRateLimit(`share-grant:${userId}`, 30, 60 * 60 * 1000);
  if (!rl.ok) {
    return {
      error: `Bạn chia sẻ quá nhanh. Thử lại sau ${Math.ceil(rl.retryAfterSec / 60)} phút.`,
    };
  }

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle();
  if (!profile) return { error: "Không tìm thấy người dùng với email này." };
  if (profile.id === userId) {
    return { error: "Bạn không thể chia sẻ cho chính mình." };
  }

  const { error } = await supabase.from("resource_shares").upsert(
    {
      resource_id: resourceId,
      shared_by: userId,
      granted_to: profile.id,
      permission_level: permissionLevel,
    },
    { onConflict: "resource_id,granted_to" },
  );
  if (error) return { error: error.message };

  const { error: updateError } = await supabase
    .from("resources")
    .update({ visibility: "shared" })
    .eq("id", resourceId)
    .eq("owner_id", userId);
  if (updateError) return { error: updateError.message };

  revalidatePath(`/kho`);
  revalidatePath(`/kho/[id]`);
  revalidatePath(`/kho/[id]/[collectionId]/[lessonId]`);
  revalidatePath(`/kho/[id]/[collectionId]/[lessonId]/[resourceId]`);
  return { success: `Đã chia sẻ cho ${email}.` };
}

export async function revokeGrantAction(formData: FormData) {
  const shareId = String(formData.get("shareId") ?? "");
  const resourceId = String(formData.get("resourceId") ?? "");
  const supabase = await createClient();
  const userId = await assertOwner(supabase, resourceId);
  if (!userId) return { error: "Bạn không sở hữu tài liệu này." };

  const { error } = await supabase
    .from("resource_shares")
    .delete()
    .eq("id", shareId)
    .eq("resource_id", resourceId);
  if (error) return { error: error.message };

  revalidatePath(`/kho`);
  revalidatePath(`/kho/[id]`);
  revalidatePath(`/kho/[id]/[collectionId]/[lessonId]`);
  revalidatePath(`/kho/[id]/[collectionId]/[lessonId]/[resourceId]`);
  return { success: "Đã thu hồi quyền truy cập." };
}

// ---------- Save a public resource into the user's library ----------

export async function savePublicResourceAction(
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const resourceId = String(formData.get("resourceId") ?? "");

  const supabase = await createClient();
  const userId = await requireUser(supabase);
  if (!userId) return { error: "Chưa đăng nhập." };

  const { data: src } = await supabase
    .from("resources")
    .select(
      "id, title, description, type, visibility, lifecycle_state, provider, storage_key, mime, size_bytes, content_hash, original_filename, external_url, youtube_id",
    )
    .eq("id", resourceId)
    .eq("visibility", "public")
    .eq("lifecycle_state", "ready")
    .is("deleted_at", null)
    .maybeSingle();
  if (!src) return { error: "Tài liệu công khai không tồn tại." };

  const { data: workspace } = await supabase
    .from("workspaces")
    .select("id")
    .eq("owner_id", userId)
    .is("deleted_at", null)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!workspace) {
    return { error: "Bạn cần có workspace để lưu tài liệu." };
  }

  const { data: collection } = await supabase
    .from("collections")
    .select("id")
    .eq("workspace_id", workspace.id)
    .is("deleted_at", null)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!collection) {
    return { error: "Workspace của bạn chưa có collection nào." };
  }

  const { data: lesson } = await supabase
    .from("lessons")
    .select("id")
    .eq("collection_id", collection.id)
    .is("deleted_at", null)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!lesson) {
    return { error: "Collection của bạn chưa có bài học nào." };
  }

  const isExternal = src.type === "url" || src.provider === "external";
  const { data: copy, error } = await supabase
    .from("resources")
    .insert({
      owner_id: userId,
      workspace_id: workspace.id,
      lesson_id: lesson.id,
      title: src.title,
      description: src.description,
      type: src.type,
      visibility: "private",
      lifecycle_state: isExternal ? "ready" : "ready",
      provider: src.provider,
      storage_key: src.storage_key,
      mime: src.mime,
      size_bytes: src.size_bytes,
      content_hash: src.content_hash,
      original_filename: src.original_filename,
      external_url: isExternal ? src.external_url : null,
      youtube_id: src.youtube_id,
    })
    .select("id")
    .single();
  if (error) return { error: error.message };

  if (isExternal && src.external_url) {
    await supabase
      .from("external_resources")
      .insert({ resource_id: copy.id, url: src.external_url });
  }

  revalidatePath(`/kho`);
  redirect(
    `/kho/${workspace.id}/${collection.id}/${lesson.id}/${copy.id}`,
  );
}