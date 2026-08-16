export type StorageErrorCode =
  | "not-found"
  | "forbidden"
  | "invalid-key"
  | "already-exists"
  | "quota-exceeded"
  | "provider-error";

export class StorageError extends Error {
  readonly code: StorageErrorCode;

  constructor(code: StorageErrorCode, message: string, cause?: unknown) {
    super(message, { cause });
    this.name = "StorageError";
    this.code = code;
  }
}

export interface StoredObjectMeta {
  sizeBytes: number;
  contentType: string | null;
  etag?: string;
  lastModified?: Date;
}

export interface UploadObjectInput {
  key: string;
  body: Uint8Array | Blob | Buffer;
  contentType?: string;
}

export function bodySize(body: Uint8Array | Blob | Buffer): number {
  if (body instanceof Blob) {
    return body.size;
  }
  return body.byteLength;
}

export interface UploadObjectResult {
  key: string;
  sizeBytes: number;
  etag?: string;
}

export interface SignedUrlOptions {
  expiresInSeconds?: number;
}

export interface StorageProvider {
  readonly name: string;
  uploadObject(input: UploadObjectInput): Promise<UploadObjectResult>;
  getSignedReadUrl(
    key: string,
    options?: SignedUrlOptions,
  ): Promise<string>;
  getSignedUploadUrl(
    key: string,
    options?: SignedUrlOptions,
  ): Promise<string>;
  getObjectMetadata(key: string): Promise<StoredObjectMeta>;
  objectExists(key: string): Promise<boolean>;
  deleteObject(key: string): Promise<void>;
}