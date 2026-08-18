"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  validateUploadFile,
  extensionOf,
  isUploadSessionStale,
  MAX_USER_QUOTA_BYTES,
  MAX_USER_QUOTA_LABEL,
} from "@/lib/upload/validate";
import { getActiveStorageProvider, isSupportedProvider } from "@/lib/storage";
import { StorageError } from "@/lib/storage/types";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

const UPLOAD_URL_EXPIRES_SECONDS = 60 * 15;
const SHA256_PATTERN = /^[a-f0-9]{64}$/i;

async function requireUser(
  supabase: SupabaseClient,
): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

async function loadOwnedResource(
  supabase: SupabaseClient,
  userId: string,
  resourceId: string,
) {
  const { data } = await supabase
    .from("resources")
    .select(
      "id, owner_id, type, lifecycle_state, provider, storage_key, updated_at, deleted_at, workspace_id, lesson_id, lessons!inner(collection_id)",
    )
    .eq("id", resourceId)
    .maybeSingle();

  if (!data || data.owner_id !== userId || data.deleted_at !== null) return null;
  return data;
}

function revalidateResourcePaths(resource: {
  workspace_id: string | null;
  lesson_id: string | null;
  lessons: unknown;
  id: string;
}) {
  const lessons = resource.lessons as
    | { collection_id?: string | null }[]
    | { collection_id?: string | null }
    | null;
  const collectionId = Array.isArray(lessons)
    ? lessons[0]?.collection_id
    : lessons?.collection_id;

  if (!resource.workspace_id || !resource.lesson_id || !collectionId) {
    return;
  }
  const base = `/kho/${resource.workspace_id}/${collectionId}/${resource.lesson_id}`;
  revalidatePath(base);
  revalidatePath(`${base}/${resource.id}`);
}

async function sumUserUsage(
  supabase: SupabaseClient,
  userId: string,
): Promise<number> {
  const { data } = await supabase
    .from("resource_files")
    .select("size_bytes, resources!inner(owner_id)")
    .eq("resources.owner_id", userId);

  const rows = Array.isArray(data) ? data : [];
  return rows.reduce((sum, row) => sum + (row.size_bytes ?? 0), 0);
}

function makeStorageKey(userId: string, resourceId: string, fileName: string) {
  const ext = extensionOf(fileName) || "bin";
  return `${userId}/${resourceId}/${randomUUID()}.${ext}`;
}

// ---------- Create upload session ----------

export async function createUploadSessionAction(
  formData: FormData,
): Promise<{ uploadUrl?: string; key?: string; error?: string }> {
  const resourceId = String(formData.get("resourceId") ?? "");
  const fileName = String(formData.get("fileName") ?? "");
  const sizeBytes = Number(formData.get("sizeBytes") ?? NaN);

  const fieldErrors = validateUploadFile({ fileName, sizeBytes });
  const fieldError = Object.values(fieldErrors)[0];
  if (fieldError) return { error: fieldError };

  const supabase = await createClient();
  const userId = await requireUser(supabase);
  if (!userId) return { error: "Chưa đăng nhập." };

  const resource = await loadOwnedResource(supabase, userId, resourceId);
  if (!resource) return { error: "Tài liệu không tồn tại." };
  if (resource.type === "url") {
    return { error: "Tài liệu ngoài không tải tệp lên được." };
  }
  if (resource.lifecycle_state !== "draft" && resource.lifecycle_state !== "failed") {
    return { error: "Tài liệu đã có tệp — không thể tải thêm." };
  }

  const usedBytes = await sumUserUsage(supabase, userId);
  if (usedBytes + sizeBytes > MAX_USER_QUOTA_BYTES) {
    return { error: `Đã vượt hạn mức lưu trữ (${MAX_USER_QUOTA_LABEL}).` };
  }

  const provider = getActiveStorageProvider();
  const key = makeStorageKey(userId, resourceId, fileName);

  let uploadUrl: string;
  try {
    uploadUrl = await provider.getSignedUploadUrl(key, {
      expiresInSeconds: UPLOAD_URL_EXPIRES_SECONDS,
    });
  } catch (error) {
    const code = error instanceof StorageError ? error.code : "provider-error";
    return { error: `Không tạo được phiên tải lên (${code}).` };
  }

  const { error: updateError } = await supabase
    .from("resources")
    .update({
      lifecycle_state: "uploading",
      provider: provider.name,
      storage_key: key,
      original_filename: fileName.trim(),
      size_bytes: sizeBytes,
    })
    .eq("id", resourceId);
  if (updateError) return { error: updateError.message };

  return { uploadUrl, key };
}

// ---------- Finalize upload ----------

export async function finalizeUploadAction(
  formData: FormData,
): Promise<{ success?: string; error?: string }> {
  const resourceId = String(formData.get("resourceId") ?? "");
  const key = String(formData.get("key") ?? "");
  const sizeBytes = Number(formData.get("sizeBytes") ?? NaN);
  const sha256 = String(formData.get("sha256") ?? "").toLowerCase();
  const mime = String(formData.get("mime") ?? "") || null;

  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) {
    return { error: "Kích thước tệp không hợp lệ." };
  }

  const supabase = await createClient();
  const userId = await requireUser(supabase);
  if (!userId) return { error: "Chưa đăng nhập." };

  const resource = await loadOwnedResource(supabase, userId, resourceId);
  if (!resource) return { error: "Tài liệu không tồn tại." };
  if (resource.lifecycle_state !== "uploading") {
    return { error: "Không có phiên tải lên đang chạy." };
  }
  if (resource.storage_key !== key) {
    return { error: "Khóa lưu trữ không khớp với phiên tải lên." };
  }
  if (!isSupportedProvider(resource.provider)) {
    return { error: "Nhà cung cấp lưu trữ không hợp lệ." };
  }

  const provider = getActiveStorageProvider();
  if (provider.name !== resource.provider) {
    return { error: "Nhà cung cấp lưu trữ đang thay đổi — hãy thử lại." };
  }

  try {
    const exists = await provider.objectExists(key);
    if (!exists) {
      await resetResourceAfterFailure(supabase, resourceId);
      return { error: "Tệp chưa được tải lên đầy đủ." };
    }

    const meta = await provider.getObjectMetadata(key);
    if (meta.sizeBytes !== sizeBytes) {
      await provider.deleteObject(key);
      await resetResourceAfterFailure(supabase, resourceId);
      return { error: "Kích thước tệp không khớp — vui lòng tải lại." };
    }

    const { data: files } = await supabase
      .from("resource_files")
      .select("version")
      .eq("resource_id", resourceId)
      .order("version", { ascending: false })
      .limit(1);
    const nextVersion = (files?.[0]?.version ?? 0) + 1;

    const { error: updateError } = await supabase
      .from("resources")
      .update({
        lifecycle_state: "ready",
        mime,
        size_bytes: sizeBytes,
        content_hash: SHA256_PATTERN.test(sha256) ? sha256 : null,
      })
      .eq("id", resourceId);
    if (updateError) return { error: updateError.message };

    const { error: fileError } = await supabase.from("resource_files").insert({
      resource_id: resourceId,
      provider: resource.provider,
      storage_key: key,
      mime,
      size_bytes: sizeBytes,
      sha256: SHA256_PATTERN.test(sha256) ? sha256 : null,
      version: nextVersion,
    });
    if (fileError) return { error: fileError.message };

    revalidateResourcePaths(resource);
    return { success: "Đã tải tệp lên." };
  } catch (error) {
    const code = error instanceof StorageError ? error.code : "unknown";
    return { error: `Không xác minh được tệp (${code}).` };
  }
}

// ---------- Cancel / cleanup ----------

export async function cancelUploadAction(
  formData: FormData,
): Promise<{ success?: string; error?: string }> {
  const resourceId = String(formData.get("resourceId") ?? "");

  const supabase = await createClient();
  const userId = await requireUser(supabase);
  if (!userId) return { error: "Chưa đăng nhập." };

  const resource = await loadOwnedResource(supabase, userId, resourceId);
  if (!resource) return { error: "Tài liệu không tồn tại." };
  if (resource.lifecycle_state !== "uploading") {
    return { error: "Không có phiên tải lên đang chạy." };
  }

  await deleteUploadObject(resource.provider, resource.storage_key);

  const { error: updateError } = await supabase
    .from("resources")
    .update({
      lifecycle_state: "draft",
      provider: null,
      storage_key: null,
      mime: null,
      size_bytes: null,
      original_filename: null,
      content_hash: null,
    })
    .eq("id", resourceId);
  if (updateError) return { error: updateError.message };

  revalidateResourcePaths(resource);
  return { success: "Đã hủy tải lên." };
}

// ---------- Abandoned upload cleanup ----------

export async function cleanupStaleUploadAction(
  formData: FormData,
): Promise<{ success?: string; error?: string }> {
  const resourceId = String(formData.get("resourceId") ?? "");
  const updatedAt = String(formData.get("updatedAt") ?? "");

  const supabase = await createClient();
  const userId = await requireUser(supabase);
  if (!userId) return { error: "Chưa đăng nhập." };

  const resource = await loadOwnedResource(supabase, userId, resourceId);
  if (!resource) return { error: "Tài liệu không tồn tại." };
  if (resource.lifecycle_state !== "uploading") {
    return { success: "Không có phiên tải lên đang chạy." };
  }

  const staleAt = resource.updated_at ?? updatedAt;
  if (!isUploadSessionStale(staleAt)) {
    return { error: "Phiên tải lên vẫn còn hiệu lực." };
  }

  await deleteUploadObject(resource.provider, resource.storage_key);

  const { error: updateError } = await supabase
    .from("resources")
    .update({
      lifecycle_state: "draft",
      provider: null,
      storage_key: null,
      mime: null,
      size_bytes: null,
      original_filename: null,
      content_hash: null,
    })
    .eq("id", resourceId);
  if (updateError) return { error: updateError.message };

  revalidateResourcePaths(resource);
  return { success: "Đã dọn phiên tải lên bị bỏ dở." };
}

async function deleteUploadObject(
  providerValue: string | null,
  storageKey: string | null,
) {
  if (!isSupportedProvider(providerValue) || !storageKey) return;
  const provider = getActiveStorageProvider();
  if (provider.name !== providerValue) return;
  try {
    await provider.deleteObject(storageKey);
  } catch {
    // Bỏ qua lỗi dọn dẹp — resource vẫn phải được reset.
  }
}

async function resetResourceAfterFailure(
  supabase: SupabaseClient,
  resourceId: string,
) {
  await supabase
    .from("resources")
    .update({
      lifecycle_state: "draft",
      provider: null,
      storage_key: null,
      mime: null,
      size_bytes: null,
      original_filename: null,
      content_hash: null,
    })
    .eq("id", resourceId);
}