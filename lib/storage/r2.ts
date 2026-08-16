import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { mapR2Error } from "./r2-error";
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

export interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
}

export function isR2ConfigComplete(
  env: Record<string, string | undefined> = process.env,
): env is Record<string, string> {
  return Boolean(
    env.R2_ACCOUNT_ID &&
      env.R2_ACCESS_KEY_ID &&
      env.R2_SECRET_ACCESS_KEY &&
      env.R2_BUCKET_NAME,
  );
}

export class R2StorageProvider implements StorageProvider {
  readonly name = "r2" as const;
  private readonly client: S3Client;
  private readonly bucketName: string;

  constructor(config: R2Config) {
    this.client = new S3Client({
      region: "auto",
      endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      forcePathStyle: true,
    });
    this.bucketName = config.bucketName;
  }

  async uploadObject(input: UploadObjectInput): Promise<UploadObjectResult> {
    try {
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucketName,
          Key: input.key,
          Body: input.body,
          ContentType: input.contentType,
        }),
      );
    } catch (error) {
      throw mapR2Error(error);
    }

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

    try {
      return await getSignedUrl(
        this.client,
        new GetObjectCommand({ Bucket: this.bucketName, Key: key }),
        { expiresIn },
      );
    } catch (error) {
      throw mapR2Error(error);
    }
  }

  async getSignedUploadUrl(
    key: string,
    options: SignedUrlOptions = {},
  ): Promise<string> {
    const expiresIn =
      options.expiresInSeconds ?? DEFAULT_EXPIRES_IN_SECONDS;

    try {
      return await getSignedUrl(
        this.client,
        new PutObjectCommand({ Bucket: this.bucketName, Key: key }),
        { expiresIn },
      );
    } catch (error) {
      throw mapR2Error(error);
    }
  }

  async getObjectMetadata(key: string): Promise<StoredObjectMeta> {
    try {
      const head = await this.client.send(
        new HeadObjectCommand({
          Bucket: this.bucketName,
          Key: key,
        }),
      );

      return {
        sizeBytes: head.ContentLength ?? 0,
        contentType: head.ContentType ?? null,
        etag: head.ETag,
        lastModified: head.LastModified,
      };
    } catch (error) {
      throw mapR2Error(error);
    }
  }

  async objectExists(key: string): Promise<boolean> {
    try {
      await this.client.send(
        new HeadObjectCommand({ Bucket: this.bucketName, Key: key }),
      );
      return true;
    } catch (error) {
      const mapped = mapR2Error(error);
      if (mapped.code === "not-found") return false;
      throw mapped;
    }
  }

  async deleteObject(key: string): Promise<void> {
    try {
      await this.client.send(
        new DeleteObjectCommand({ Bucket: this.bucketName, Key: key }),
      );
    } catch (error) {
      throw mapR2Error(error);
    }
  }
}

export function r2ConfigFromEnv(): R2Config {
  if (!isR2ConfigComplete()) {
    throw new StorageError(
      "provider-error",
      "R2 chưa được cấu hình: thiếu R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY hoặc R2_BUCKET_NAME",
    );
  }

  return {
    accountId: process.env.R2_ACCOUNT_ID!,
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    bucketName: process.env.R2_BUCKET_NAME!,
  };
}