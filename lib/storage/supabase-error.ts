import { StorageError, type StorageErrorCode } from "./types";

type SupabaseStorageFailure = {
  message?: string;
  statusCode?: number | string;
  code?: string;
  error?: string;
};

function isSupabaseFailure(value: unknown): value is SupabaseStorageFailure {
  return (
    typeof value === "object" &&
    value !== null &&
    ("statusCode" in value || "code" in value || "status" in value)
  );
}

function normalizeStatus(status: number | string | undefined): number | undefined {
  if (status === undefined) return undefined;
  const parsed = typeof status === "number" ? status : Number(status);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function codeForStatus(status: number): StorageErrorCode {
  if (status === 404) return "not-found";
  if (status === 403) return "forbidden";
  if (status === 400) return "invalid-key";
  if (status === 409) return "already-exists";
  if (status === 413) return "quota-exceeded";
  return "provider-error";
}

function codeForMessage(message: string): StorageErrorCode | null {
  if (/not found|does not exist|not exist|missing/i.test(message)) {
    return "not-found";
  }
  if (/forbidden|permission|access denied/i.test(message)) {
    return "forbidden";
  }
  if (/already exists/i.test(message)) {
    return "already-exists";
  }
  return null;
}

export function mapSupabaseStorageError(error: unknown): StorageError {
  const failure: SupabaseStorageFailure | null = isSupabaseFailure(error)
    ? error
    : null;
  const status = normalizeStatus(failure?.statusCode);
  const message = failure?.message ?? "Supabase Storage lỗi";

  let code: StorageErrorCode = "provider-error";
  if (failure?.code === "NoSuchKey" || failure?.code === "NotFound") {
    code = "not-found";
  } else if (status !== undefined) {
    code = codeForStatus(status);
  } else {
    code = codeForMessage(message) ?? "provider-error";
  }

  return new StorageError(code, message, error);
}