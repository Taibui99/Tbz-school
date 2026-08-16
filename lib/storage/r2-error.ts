import { StorageError, type StorageErrorCode } from "./types";

type AwsError = {
  name?: string;
  $metadata?: { httpStatusCode?: number };
  message?: string;
};

function isAwsError(value: unknown): value is AwsError {
  return typeof value === "object" && value !== null;
}

function codeForR2Error(error: AwsError): StorageErrorCode {
  const status = error.$metadata?.httpStatusCode;
  const name = error.name;

  if (name === "NoSuchKey" || name === "NotFound" || status === 404) {
    return "not-found";
  }
  if (name === "AccessDenied" || status === 403) {
    return "forbidden";
  }
  if (name === "NoSuchBucket") {
    return "provider-error";
  }
  if (status === 400) {
    return "invalid-key";
  }
  if (name === "PreconditionFailed" || status === 412) {
    return "already-exists";
  }
  return "provider-error";
}

export function mapR2Error(error: unknown): StorageError {
  if (error instanceof StorageError) return error;

  const awsError: AwsError = isAwsError(error) ? error : {};
  const message =
    awsError.message ??
    (error instanceof Error ? error.message : "R2 lỗi");

  return new StorageError(
    codeForR2Error(awsError),
    message,
    error,
  );
}