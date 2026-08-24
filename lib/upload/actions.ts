"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  validateUploadFile,
  extensionOf,
  isUploadSessionStale,
  mimeFromFileName,
  resourceTypeFromFileName,
  titleFromFileName,
  MAX_USER_QUOTA_BYTES,
  MAX_USER_QUOTA_LABEL,
} from "@/lib/upload/validate";
import { getActiveStorageProvider, isSupportedProvider } from "@/lib/storage";
import { StorageError } from "@/lib/storage/types";
import { getAccessToken, initiateResumableVideoUpload } from "@/lib/youtube/client";
import { getGoogleConnection } from "@/lib/youtube/store";
import { buildYoutubeVideoTitle } from "@/lib/youtube/title";
import {
  buildReusedResourceFileRow,
  buildReusedResourceRow,
  canDeduplicate,
  type ReusableObject,
} from "@/lib/upload/dedup";
import { checkRateLimit } from "@/lib/security/rate-limit";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

type OwnedResource = NonNullable<
  Awaited<ReturnType<typeof loadOwnedResource>>
>;

const UPLOAD_URL_EXPIRES_SECONDS = 60 * 15;
const SHA256_PATTERN = /^[a-f0-9]{64}$/i;
const YOUTUBE_VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{5,64}$/;

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
      "id, owner_id, type, title, description, lifecycle_state, provider, storage_key, updated_at, deleted_at, workspace_id, lesson_id, lessons!inner(collection_id)",
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

// ---------- Deduplication (Phase 19) ----------

async function findReusableObject(
  supabase: SupabaseClient,
  userId: string,
  contentHash: string,
): Promise<ReusableObject | null> {
  const { data } = await supabase
    .from("resources")
    .select("id, storage_key, provider, mime, size_bytes")
    .eq("owner_id", userId)
    .eq("content_hash", contentHash)
    .eq("lifecycle_state", "ready")
    .is("deleted_at", null)
    .not("storage_key", "is", null)
    .in("provider", ["r2", "supabase_storage"])
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!data || typeof data.storage_key !== "string") return null;
  if (!isSupportedProvider(data.provider)) return null;
  if (typeof data.size_bytes !== "number" || data.size_bytes <= 0) return null;
  return data as ReusableObject;
}

// Tạo resource "ready" tái sử dụng object đã có — dùng cho cả quick upload
// (thả tệp vào explorer) lẫn upload vào draft có sẵn.
async function completeWithReusedObject(
  supabase: SupabaseClient,
  input: {
    ownerId: string;
    workspaceId: string;
    lessonId: string;
    resourceId?: string;
    title: string;
    resourceType: string;
    originalFilename: string;
    contentHash: string;
    source: ReusableObject;
  },
): Promise<{ resourceId?: string; error?: string }> {
  const existingId = input.resourceId;
  let resourceId: string;

  if (existingId) {
    resourceId = existingId;
    const { error } = await supabase
      .from("resources")
      .update(buildReusedResourceRow({ ...input }))
      .eq("id", resourceId);
    if (error) return { error: error.message };
  } else {
    const { data, error } = await supabase
      .from("resources")
      .insert(buildReusedResourceRow({ ...input }))
      .select("id")
      .single();
    if (error || !data) return { error: error?.message ?? "Không tạo được tài liệu." };
    resourceId = data.id;
  }

  // Phiên bản tệp v1 tham chiếu cùng storage_key (ref-count giữ object sống).
  const { data: files } = await supabase
    .from("resource_files")
    .select("version")
    .eq("resource_id", resourceId)
    .order("version", { ascending: false })
    .limit(1);

  const { error: fileError } = await supabase.from("resource_files").insert(
    buildReusedResourceFileRow({
      resourceId,
      source: input.source,
      contentHash: input.contentHash,
      version: (files?.[0]?.version ?? 0) + 1,
    }),
  );
  if (fileError) return { error: fileError.message };

  return { resourceId };
}

// ---------- Create upload session ----------

type UploadSessionResult = {
  uploadUrl?: string;
  key?: string;
  video?: boolean;
  mime?: string;
  duplicate?: boolean;
  error?: string;
};

export async function createUploadSessionAction(
  formData: FormData,
): Promise<UploadSessionResult> {
  const resourceId = String(formData.get("resourceId") ?? "");
  const fileName = String(formData.get("fileName") ?? "");
  const sizeBytes = Number(formData.get("sizeBytes") ?? NaN);

  const supabase = await createClient();
  const userId = await requireUser(supabase);
  if (!userId) return { error: "Chưa đăng nhập." };

  const rl = checkRateLimit(`upload:${userId}`, 40, 60 * 60 * 1000);
  if (!rl.ok) {
    return {
      error: `Bạn tạo phiên tải lên quá nhanh. Thử lại sau ${Math.ceil(rl.retryAfterSec / 60)} phút.`,
    };
  }

  const resource = await loadOwnedResource(supabase, userId, resourceId);
  if (!resource) return { error: "Tài liệu không tồn tại." };
  if (resource.type === "url") {
    return { error: "Tài liệu ngoài không tải tệp lên được." };
  }
  if (resource.lifecycle_state !== "draft" && resource.lifecycle_state !== "failed") {
    return { error: "Tài liệu đã có tệp — không thể tải thêm." };
  }

  // Dedup: tệp giống hệt đã có trong kho → tái sử dụng object, không upload lại.
  const sha256Raw = String(formData.get("sha256") ?? "").toLowerCase();
  const contentHash = SHA256_PATTERN.test(sha256Raw) ? sha256Raw : null;
  if (canDeduplicate({ resourceType: resource.type, sha256: contentHash })) {
    const source = await findReusableObject(supabase, userId, contentHash!);
    if (source) {
      const result = await completeWithReusedObject(supabase, {
        ownerId: userId,
        workspaceId: resource.workspace_id ?? "",
        lessonId: resource.lesson_id ?? "",
        resourceId: resource.id,
        title: resource.title,
        resourceType: resource.type,
        originalFilename: fileName.trim(),
        contentHash: contentHash!,
        source,
      });
      if (result.error) return { error: result.error };
      revalidateResourcePaths(resource);
      return { duplicate: true, key: source.storage_key };
    }
  }

  return startUploadSession(supabase, userId, resource, fileName, sizeBytes);
}

async function startUploadSession(
  supabase: SupabaseClient,
  userId: string,
  resource: { id: string; type: string; title: string; description: string | null },
  fileName: string,
  sizeBytes: number,
): Promise<UploadSessionResult> {
  const isVideo = resource.type === "video";
  const fieldErrors = validateUploadFile(
    { fileName, sizeBytes },
    { maxSizeBytes: isVideo ? Number.POSITIVE_INFINITY : undefined },
  );
  const fieldError = Object.values(fieldErrors)[0];
  if (fieldError) return { error: fieldError };

  if (isVideo) {
    return createYoutubeUploadSession({
      supabase,
      userId,
      resource,
      fileName,
      sizeBytes,
    });
  }

  const usedBytes = await sumUserUsage(supabase, userId);
  if (usedBytes + sizeBytes > MAX_USER_QUOTA_BYTES) {
    return { error: `Đã vượt hạn mức lưu trữ (${MAX_USER_QUOTA_LABEL}).` };
  }

  const provider = getActiveStorageProvider();
  const key = makeStorageKey(userId, resource.id, fileName);

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
    .eq("id", resource.id);
  if (updateError) return { error: updateError.message };

  return { uploadUrl, key };
}

const QUICK_COLLECTION_NAME = "Chung";
const QUICK_LESSON_NAME = "Tài liệu chung";

export async function quickUploadSessionAction(
  formData: FormData,
): Promise<
  UploadSessionResult & {
    resourceId?: string;
    collectionId?: string;
    lessonId?: string;
  }
> {
  const workspaceId = String(formData.get("workspaceId") ?? "");
  const inputCollectionId = String(formData.get("collectionId") ?? "");
  const inputLessonId = String(formData.get("lessonId") ?? "");
  const fileName = String(formData.get("fileName") ?? "");
  const sizeBytes = Number(formData.get("sizeBytes") ?? NaN);

  if (!workspaceId) return { error: "Thiếu workspace." };

  const resourceType = resourceTypeFromFileName(fileName);
  if (!resourceType || resourceType === "url") {
    return {
      error:
        "Loại tệp không hỗ trợ — chỉ nhận pdf, doc(x), ppt(x), xls(x), ảnh, video, âm thanh, txt/md/csv.",
    };
  }

  const supabase = await createClient();
  const userId = await requireUser(supabase);
  if (!userId) return { error: "Chưa đăng nhập." };

  // Xác định bài học đích — thả file ở cấp cao hơn sẽ tự dùng/tạo thư mục mặc định.
  let targetCollectionId: string;
  let targetLessonId: string;

  if (inputLessonId && inputCollectionId) {
    const { data: lesson } = await supabase
      .from("lessons")
      .select("id, collection_id, collections!inner(workspace_id)")
      .eq("id", inputLessonId)
      .eq("collections.workspace_id", workspaceId)
      .maybeSingle();
    if (!lesson) return { error: "Bài học không thuộc workspace này." };
    targetCollectionId = lesson.collection_id;
    targetLessonId = inputLessonId;
  } else if (inputCollectionId) {
    const { data: collection } = await supabase
      .from("collections")
      .select("id")
      .eq("id", inputCollectionId)
      .eq("workspace_id", workspaceId)
      .maybeSingle();
    if (!collection) return { error: "Bộ sưu tập không thuộc workspace này." };
    targetCollectionId = inputCollectionId;

    const lesson = await findOrCreateDefaultLesson(supabase, inputCollectionId);
    if (typeof lesson !== "string") return lesson;
    targetLessonId = lesson;
  } else {
    const collection = await findOrCreateDefaultCollection(supabase, workspaceId);
    if (typeof collection !== "string") return collection;
    targetCollectionId = collection;

    const lesson = await findOrCreateDefaultLesson(supabase, collection);
    if (typeof lesson !== "string") return lesson;
    targetLessonId = lesson;
  }

  const sha256Raw = String(formData.get("sha256") ?? "").toLowerCase();
  const contentHash = SHA256_PATTERN.test(sha256Raw) ? sha256Raw : null;

  // Dedup: chủ sở hữu đã có tệp giống hệt (hash trùng, ready, chưa xóa) →
  // tạo resource mới tham chiếu object cũ, bỏ qua bước tải lên.
  if (canDeduplicate({ resourceType, sha256: contentHash })) {
    const source = await findReusableObject(supabase, userId, contentHash!);
    if (source) {
      const result = await completeWithReusedObject(supabase, {
        ownerId: userId,
        workspaceId,
        lessonId: targetLessonId,
        title: titleFromFileName(fileName),
        resourceType,
        originalFilename: fileName.trim(),
        contentHash: contentHash!,
        source,
      });
      if (result.error || !result.resourceId) {
        return { error: result.error ?? "Không tạo được tài liệu." };
      }
      revalidatePath("/kho");
      return {
        duplicate: true,
        key: source.storage_key,
        resourceId: result.resourceId,
        collectionId: targetCollectionId,
        lessonId: targetLessonId,
      };
    }
  }

  const { data: resourceRow, error: insertError } = await supabase
    .from("resources")
    .insert({
      owner_id: userId,
      workspace_id: workspaceId,
      lesson_id: targetLessonId,
      title: titleFromFileName(fileName),
      description: null,
      type: resourceType,
      visibility: "private",
      lifecycle_state: "draft",
    })
    .select("id")
    .single();
  if (insertError) return { error: insertError.message };

  const session = await startUploadSession(
    supabase,
    userId,
    {
      id: resourceRow.id,
      type: resourceType,
      title: titleFromFileName(fileName),
      description: null,
    },
    fileName,
    sizeBytes,
  );
  if (session.error) return session;

  revalidatePath("/kho");
  return {
    ...session,
    resourceId: resourceRow.id,
    collectionId: targetCollectionId,
    lessonId: targetLessonId,
  };
}

async function findOrCreateDefaultCollection(
  supabase: SupabaseClient,
  workspaceId: string,
): Promise<string | { error: string }> {
  const { data: existing } = await supabase
    .from("collections")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("name", QUICK_COLLECTION_NAME)
    .limit(1)
    .maybeSingle();
  if (existing) return existing.id;

  const { data: maxRow } = await supabase
    .from("collections")
    .select("position")
    .eq("workspace_id", workspaceId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: created, error } = await supabase
    .from("collections")
    .insert({
      workspace_id: workspaceId,
      name: QUICK_COLLECTION_NAME,
      description: "",
      position: (maxRow?.position ?? -1) + 1,
    })
    .select("id")
    .single();
  if (error) return { error: error.message };
  return created.id;
}

async function findOrCreateDefaultLesson(
  supabase: SupabaseClient,
  collectionId: string,
): Promise<string | { error: string }> {
  const { data: existing } = await supabase
    .from("lessons")
    .select("id")
    .eq("collection_id", collectionId)
    .eq("name", QUICK_LESSON_NAME)
    .limit(1)
    .maybeSingle();
  if (existing) return existing.id;

  const { data: maxRow } = await supabase
    .from("lessons")
    .select("position")
    .eq("collection_id", collectionId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: created, error } = await supabase
    .from("lessons")
    .insert({
      collection_id: collectionId,
      name: QUICK_LESSON_NAME,
      description: "",
      position: (maxRow?.position ?? -1) + 1,
    })
    .select("id")
    .single();
  if (error) return { error: error.message };
  return created.id;
}

async function createYoutubeUploadSession({
  supabase,
  userId,
  resource,
  fileName,
  sizeBytes,
}: {
  supabase: SupabaseClient;
  userId: string;
  resource: { id: string; title: string; description: string | null };
  fileName: string;
  sizeBytes: number;
}): Promise<UploadSessionResult> {
  const connection = await getGoogleConnection();
  if (!connection.connected || !connection.refreshToken) {
    return {
      error:
        "Kho video trung tâm chưa được kết nối. Quản trị viên kết nối tại trang cá nhân (/ho-so).",
    };
  }

  let accessToken: string;
  try {
    accessToken = await getAccessToken(connection.refreshToken);
  } catch (error) {
    const message =
      error instanceof Error && error.message
        ? error.message
        : "Không lấy được quyền upload lên YouTube.";
    return { error: message };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", userId)
    .maybeSingle();

  const title = buildYoutubeVideoTitle({
    fullName: profile?.full_name,
    originalFilename: fileName,
    fallbackTitle: resource.title,
  });

  const mime = mimeFromFileName(fileName);

  let uploadUrl: string;
  try {
    ({ uploadUrl } = await initiateResumableVideoUpload({
      accessToken,
      title,
      description: resource.description ?? "",
      mime,
      sizeBytes,
    }));
  } catch (error) {
    const message =
      error instanceof Error && error.message
        ? error.message
        : "Không khởi tạo được phiên đăng video lên YouTube.";
    return { error: message };
  }

  const { error: updateError } = await supabase
    .from("resources")
    .update({
      lifecycle_state: "uploading",
      provider: "youtube",
      storage_key: null,
      original_filename: fileName.trim(),
      size_bytes: sizeBytes,
      mime,
    })
    .eq("id", resource.id);
  if (updateError) return { error: updateError.message };

  return { uploadUrl, key: "youtube", video: true, mime };
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

  if (resource.provider === "youtube") {
    return finalizeYoutubeUpload({ supabase, resource, resourceId, formData });
  }

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

async function finalizeYoutubeUpload({
  supabase,
  resource,
  resourceId,
  formData,
}: {
  supabase: SupabaseClient;
  resource: OwnedResource;
  resourceId: string;
  formData: FormData;
}): Promise<{ success?: string; error?: string }> {
  const uploadUrl = String(formData.get("uploadUrl") ?? "");
  const sizeBytes = Number(formData.get("sizeBytes") ?? NaN);
  const mime = String(formData.get("mime") ?? "") || null;

  if (
    !uploadUrl.startsWith(
      "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable",
    )
  ) {
    return { error: "Phiên tải lên không hợp lệ." };
  }
  if (resource.lifecycle_state !== "uploading") {
    return { error: "Không có phiên tải lên đang chạy." };
  }

  const videoId = await fetchYoutubeVideoId(uploadUrl, sizeBytes);
  if (!videoId) {
    await resetResourceAfterFailure(supabase, resourceId);
    return {
      error: "Video chưa được tải xong lên YouTube — hãy thử lại.",
    };
  }

  const { error: updateError } = await supabase
    .from("resources")
    .update({
      lifecycle_state: "ready",
      youtube_id: videoId,
      mime,
      size_bytes: sizeBytes,
      content_hash: null,
    })
    .eq("id", resourceId);
  if (updateError) return { error: updateError.message };

  revalidateResourcePaths(resource);
  return { success: "Video đã được đăng lên kênh Tbz cloud (unlisted)." };
}

async function fetchYoutubeVideoId(
  uploadUrl: string,
  sizeBytes: number,
): Promise<string | null> {
  for (let attempt = 0; attempt < 6; attempt++) {
    const res = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Range": `bytes */${sizeBytes}` },
    });
    if (res.status === 200) {
      const data = await res.json().catch(() => null);
      const id = typeof data?.id === "string" ? data.id : null;
      if (id && YOUTUBE_VIDEO_ID_PATTERN.test(id)) return id;
    }
    if (res.status !== 308) break;
    await new Promise((resolve) => setTimeout(resolve, 1500 * (attempt + 1)));
  }
  return null;
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