import type { StorageProviderName } from "@/lib/storage";

// Tệp đủ điều kiện dedup: phải có hash và lưu vào object storage thật.
// Video đi thẳng YouTube (external) còn url là liên kết ngoài — không dedup.
export function canDeduplicate(input: {
  resourceType: string;
  sha256: string | null;
}): boolean {
  return (
    input.sha256 !== null &&
    input.resourceType !== "video" &&
    input.resourceType !== "url"
  );
}

export type ReusableObject = {
  id: string;
  storage_key: string;
  provider: StorageProviderName;
  mime: string | null;
  size_bytes: number;
};

export type ReusedResourceRow = {
  owner_id: string;
  folder_id: string | null;
  title: string;
  type: string;
  visibility: "private";
  lifecycle_state: "ready";
  provider: StorageProviderName;
  storage_key: string;
  original_filename: string;
  mime: string | null;
  size_bytes: number;
  content_hash: string;
};

// Resource mới trỏ tới object đã tồn tại của cùng chủ sở hữu —
// không nhân bản bytes, quota vẫn tính theo tham chiếu (xem ADR-025).
export function buildReusedResourceRow(input: {
  ownerId: string;
  folderId: string | null;
  title: string;
  resourceType: string;
  originalFilename: string;
  source: ReusableObject;
  contentHash: string;
}): ReusedResourceRow {
  return {
    owner_id: input.ownerId,
    folder_id: input.folderId,
    title: input.title,
    type: input.resourceType,
    visibility: "private",
    lifecycle_state: "ready",
    provider: input.source.provider,
    storage_key: input.source.storage_key,
    original_filename: input.originalFilename,
    mime: input.source.mime,
    size_bytes: input.source.size_bytes,
    content_hash: input.contentHash,
  };
}

export type ReusedResourceFileRow = {
  resource_id: string;
  provider: StorageProviderName;
  storage_key: string;
  mime: string | null;
  size_bytes: number;
  sha256: string;
  version: number;
};

export function buildReusedResourceFileRow(input: {
  resourceId: string;
  source: ReusableObject;
  contentHash: string;
  version?: number;
}): ReusedResourceFileRow {
  return {
    resource_id: input.resourceId,
    provider: input.source.provider,
    storage_key: input.source.storage_key,
    mime: input.source.mime,
    size_bytes: input.source.size_bytes,
    sha256: input.contentHash,
    version: input.version ?? 1,
  };
}
