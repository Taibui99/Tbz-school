import { createAdminClient } from "@/lib/supabase/admin";
import { mapSupabaseStorageError } from "./supabase-error";
import {
  StorageError,
  bodySize,
  type SignedUrlOptions,
  type StoredObjectMeta,
  type StorageProvider,
  type UploadObjectInput,
  type UploadObjectResult,
} from "./types";

const DEFAULT_EXPIRES_IN_SECONDS = 60 * 15;

export class SupabaseStorageProvider implements StorageProvider {
  readonly name = "supabase_storage" as const;
  private readonly bucket: string;

  constructor(bucket: string) {
    this.bucket = bucket;
  }

  private get storage() {
    return createAdminClient().storage;
  }

  async uploadObject(input: UploadObjectInput): Promise<UploadObjectResult> {
    const { error } = await this.storage
      .from(this.bucket)
      .upload(input.key, input.body, {
        contentType: input.contentType,
        upsert: false,
      });

    if (error) throw mapSupabaseStorageError(error);

    return {
      key: input.key,
      sizeBytes: bodySize(input.body),
    };
  }

  async getSignedReadUrl(
    key: string,
    options: SignedUrlOptions = {},
  ): Promise<string> {
    const expiresIn =
      options.expiresInSeconds ?? DEFAULT_EXPIRES_IN_SECONDS;
    const { data, error } = await this.storage
      .from(this.bucket)
      .createSignedUrl(key, expiresIn);

    if (error) throw mapSupabaseStorageError(error);
    if (!data?.signedUrl) {
      throw new StorageError(
        "provider-error",
        "Supabase Storage không trả về signed URL",
      );
    }

    return data.signedUrl;
  }

  async getSignedUploadUrl(
    key: string,
    _options: SignedUrlOptions = {},
  ): Promise<string> {
    const { data, error } = await this.storage
      .from(this.bucket)
      .createSignedUploadUrl(key, { upsert: false });

    if (error) throw mapSupabaseStorageError(error);
    if (!data?.signedUrl || !data.token) {
      throw new StorageError(
        "provider-error",
        "Supabase Storage không trả về signed upload URL",
      );
    }

    return data.signedUrl;
  }

  async getObjectMetadata(key: string): Promise<StoredObjectMeta> {
    const { data, error } = await this.storage
      .from(this.bucket)
      .info(key);

    if (error) throw mapSupabaseStorageError(error);

    const metadata = data?.metadata as
      | { size?: number; mimetype?: string; etag?: string }
      | undefined;

    return {
      sizeBytes: metadata?.size ?? data?.size ?? 0,
      contentType: data?.contentType ?? metadata?.mimetype ?? null,
      etag: data?.etag ?? metadata?.etag,
      lastModified: data?.lastModified
        ? new Date(data.lastModified)
        : undefined,
    };
  }

  async objectExists(key: string): Promise<boolean> {
    const { data, error } = await this.storage
      .from(this.bucket)
      .info(key);

    if (!error && data) return true;

    const mapped = mapSupabaseStorageError(error);
    if (mapped.code === "not-found") return false;
    throw mapped;
  }

  async deleteObject(key: string): Promise<void> {
    const { error } = await this.storage.from(this.bucket).remove([key]);

    if (error) {
      const mapped = mapSupabaseStorageError(error);
      if (mapped.code === "not-found") return;
      throw mapped;
    }
  }
}