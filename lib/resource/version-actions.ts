"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  validateUploadFile,
  extensionOf,
} from "@/lib/upload/validate";
import { getActiveStorageProvider, isSupportedProvider } from "@/lib/storage";
import { StorageError } from "@/lib/storage/types";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

const UPLOAD_URL_EXPIRES_SECONDS = 60 * 15;
const SHA256_PATTERN = /^[a-f0-9]{64}$/i;

export type VersionActionResult = { success?: string; error?: string };

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
      "id, owner_id, type, lifecycle_state, provider, storage_key, mime, size_bytes, content_hash, original_filename, updated_at, deleted_at, workspace_id, lesson_id, lessons!inner(collection_id)",
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

  if (!resource.workspace_id || !resource.lesson_id || !collectionId) return;
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

// ---------- New version upload session ----------

export async function createVersionUploadSessionAction(
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
  if (resource.lifecycle_state !== "ready" || !resource.storage_key) {
    return { error: "Tài liệu chưa có tệp để tạo phiên bản mới." };
  }

  const usedBytes = await sumUserUsage(supabase, userId);
  if (usedBytes + sizeBytes > 1024 * 1024 * 1024) {
    return { error: "Đã vượt hạn mức lưu trữ (1 GB)." };
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

  return { uploadUrl, key };
}

// ---------- Finalize new version ----------

export async function finalizeVersionUploadAction(
  formData: FormData,
): Promise<VersionActionResult> {
  const resourceId = String(formData.get("resourceId") ?? "");
  const key = String(formData.get("key") ?? "");
  const sizeBytes = Number(formData.get("sizeBytes") ?? NaN);
  const sha256 = String(formData.get("sha256") ?? "").toLowerCase();
  const mime = String(formData.get("mime") ?? "") || null;
  const fileName = String(formData.get("fileName") ?? "").trim();

  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) {
    return { error: "Kích thước tệp không hợp lệ." };
  }

  const supabase = await createClient();
  const userId = await requireUser(supabase);
  if (!userId) return { error: "Chưa đăng nhập." };

  const resource = await loadOwnedResource(supabase, userId, resourceId);
  if (!resource) return { error: "Tài liệu không tồn tại." };
  if (resource.lifecycle_state !== "ready" || !resource.storage_key) {
    return { error: "Không có phiên bản tệp đang tải." };
  }
  if (!key.startsWith(`${userId}/${resourceId}/`)) {
    return { error: "Khóa lưu trữ không hợp lệ." };
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
    if (!exists) return { error: "Tệp chưa được tải lên đầy đủ." };

    const meta = await provider.getObjectMetadata(key);
    if (meta.sizeBytes !== sizeBytes) {
      await provider.deleteObject(key);
      return { error: "Kích thước tệp không khớp — vui lòng tải lại." };
    }

    const { data: files } = await supabase
      .from("resource_files")
      .select("version")
      .eq("resource_id", resourceId)
      .order("version", { ascending: false })
      .limit(1);
    const nextVersion = (files?.[0]?.version ?? 0) + 1;

    const { error: fileError } = await supabase.from("resource_files").insert({
      resource_id: resourceId,
      provider: resource.provider,
      storage_key: key,
      mime,
      size_bytes: sizeBytes,
      sha256: SHA256_PATTERN.test(sha256) ? sha256 : null,
      version: nextVersion,
    });
    if (fileError) {
      await provider.deleteObject(key);
      return { error: "Không lưu được phiên bản mới." };
    }

    const { error: updateError } = await supabase
      .from("resources")
      .update({
        lifecycle_state: "ready",
        provider: resource.provider,
        storage_key: key,
        mime,
        size_bytes: sizeBytes,
        content_hash: SHA256_PATTERN.test(sha256) ? sha256 : null,
        original_filename: fileName || resource.original_filename,
      })
      .eq("id", resourceId);
    if (updateError) {
      await provider.deleteObject(key);
      return { error: "Không cập nhật được tài liệu." };
    }

    revalidateResourcePaths(resource);
    return { success: "Đã tải phiên bản mới." };
  } catch (error) {
    const code = error instanceof StorageError ? error.code : "unknown";
    return { error: `Không xác minh được tệp (${code}).` };
  }
}

// ---------- Restore a previous version ----------

export async function restoreVersionAction(
  _prev: VersionActionResult,
  formData: FormData,
): Promise<VersionActionResult> {
  const resourceId = String(formData.get("resourceId") ?? "").trim();
  const version = Number(formData.get("version") ?? NaN);

  if (!resourceId || !Number.isInteger(version) || version < 1) {
    return { error: "Thông tin phiên bản không hợp lệ." };
  }

  const supabase = await createClient();
  const userId = await requireUser(supabase);
  if (!userId) return { error: "Chưa đăng nhập." };

  const resource = await loadOwnedResource(supabase, userId, resourceId);
  if (!resource) return { error: "Tài liệu không tồn tại." };
  if (resource.lifecycle_state !== "ready") {
    return { error: "Tài liệu chưa sẵn sàng." };
  }

  const { data: file } = await supabase
    .from("resource_files")
    .select("provider, storage_key, mime, size_bytes, sha256")
    .eq("resource_id", resourceId)
    .eq("version", version)
    .maybeSingle();
  if (!file || !file.storage_key) return { error: "Phiên bản không tồn tại." };
  if (!isSupportedProvider(file.provider)) {
    return { error: "Nhà cung cấp lưu trữ không hợp lệ." };
  }

  const provider = getActiveStorageProvider();
  if (provider.name !== file.provider) {
    return { error: "Nhà cung cấp lưu trữ đang thay đổi — hãy thử lại." };
  }

  try {
    const exists = await provider.objectExists(file.storage_key);
    if (!exists) return { error: "Tệp của phiên bản cũ không còn tồn tại." };
  } catch (error) {
    const code = error instanceof StorageError ? error.code : "unknown";
    return { error: `Không kiểm tra được tệp (${code}).` };
  }

  const { error: updateError } = await supabase
    .from("resources")
    .update({
      lifecycle_state: "ready",
      provider: file.provider,
      storage_key: file.storage_key,
      mime: file.mime,
      size_bytes: file.size_bytes,
      content_hash: file.sha256,
    })
    .eq("id", resourceId);
  if (updateError) return { error: "Không khôi phục được phiên bản." };

  revalidateResourcePaths(resource);
  return { success: `Đã khôi phục phiên bản ${version}.` };
}