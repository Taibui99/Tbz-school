import { StorageError } from "./types";
import { R2StorageProvider, isR2ConfigComplete, r2ConfigFromEnv } from "./r2";
import { SupabaseStorageProvider } from "./supabase-storage";
import { ExternalStorageProvider } from "./external";
import type { StorageProvider } from "./types";

export const STORAGE_PROVIDERS = ["r2", "supabase_storage", "external"] as const;
export type StorageProviderName = (typeof STORAGE_PROVIDERS)[number];

const DEFAULT_BUCKET = "files";

let cachedR2Provider: R2StorageProvider | null = null;
let cachedSupabaseProvider: SupabaseStorageProvider | null = null;

export function createExternalStorageProvider(
  url: string,
): ExternalStorageProvider {
  return new ExternalStorageProvider(url);
}

export function getStorageProvider(
  name: StorageProviderName,
): StorageProvider {
  if (name === "external") {
    throw new StorageError(
      "provider-error",
      "External provider cần URL — dùng createExternalStorageProvider(url)",
    );
  }

  if (name === "r2") {
    if (!cachedR2Provider) {
      cachedR2Provider = new R2StorageProvider(r2ConfigFromEnv());
    }
    return cachedR2Provider;
  }

  if (name === "supabase_storage") {
    if (!cachedSupabaseProvider) {
      cachedSupabaseProvider = new SupabaseStorageProvider(DEFAULT_BUCKET);
    }
    return cachedSupabaseProvider;
  }

  throw new StorageError("provider-error", `Provider không hỗ trợ: ${name}`);
}

export function getActiveStorageProvider(): StorageProvider {
  if (isR2ConfigComplete()) {
    return getStorageProvider("r2");
  }
  return getStorageProvider("supabase_storage");
}

export function isSupportedProvider(
  value: string | null | undefined,
): value is StorageProviderName {
  return STORAGE_PROVIDERS.includes(value as StorageProviderName);
}

export type { StorageProvider } from "./types";
export { StorageError } from "./types";