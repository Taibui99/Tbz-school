export const APP_ENV_VARS = [
  "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
] as const;

export const OPTIONAL_ENV_VARS = [
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET_NAME",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
] as const;

export type AppEnvVar = (typeof APP_ENV_VARS)[number];

export function getR2EnvVars(
  env: Record<string, string | undefined> = process.env,
): (typeof OPTIONAL_ENV_VARS)[number][] {
  return OPTIONAL_ENV_VARS.filter((name) => !env[name]);
}

export function getMissingEnvVars(
  env: Record<string, string | undefined> = process.env,
): AppEnvVar[] {
  return APP_ENV_VARS.filter((name) => !env[name]);
}

export function validateEnv(
  env: Record<string, string | undefined> = process.env,
  options: { strict?: boolean } = {},
): { ok: boolean; missing: AppEnvVar[] } {
  const missing = getMissingEnvVars(env);

  if (missing.length > 0 && options.strict) {
    throw new Error(
      `Thiếu biến môi trường bắt buộc: ${missing.join(", ")}`,
    );
  }

  return { ok: missing.length === 0, missing };
}