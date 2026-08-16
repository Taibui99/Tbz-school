import {
  StorageError,
  type SignedUrlOptions,
  type StoredObjectMeta,
  type StorageProvider,
  type UploadObjectInput,
  type UploadObjectResult,
} from "./types";

export class ExternalStorageProvider implements StorageProvider {
  readonly name = "external" as const;
  private readonly url: string;

  constructor(url: string) {
    this.url = url;
  }

  async uploadObject(_input: UploadObjectInput): Promise<UploadObjectResult> {
    throw new StorageError(
      "provider-error",
      "External resource không hỗ trợ upload object",
    );
  }

  async getSignedReadUrl(
    _key: string,
    _options: SignedUrlOptions = {},
  ): Promise<string> {
    return this.url;
  }

  async getSignedUploadUrl(
    _key: string,
    _options: SignedUrlOptions = {},
  ): Promise<string> {
    throw new StorageError(
      "provider-error",
      "External resource không hỗ trợ upload object",
    );
  }

  async getObjectMetadata(_key: string): Promise<StoredObjectMeta> {
    return {
      sizeBytes: 0,
      contentType: null,
    };
  }

  async objectExists(_key: string): Promise<boolean> {
    return true;
  }

  async deleteObject(_key: string): Promise<void> {
    return;
  }
}