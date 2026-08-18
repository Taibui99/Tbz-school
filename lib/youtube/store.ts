import { createAdminClient } from "@/lib/supabase/admin";

export interface GoogleConnection {
  connected: boolean;
  email: string | null;
  refreshToken: string | null;
}

export async function getGoogleConnection(): Promise<GoogleConnection> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("google_oauth")
    .select("id, email, refresh_token")
    .eq("id", 1)
    .maybeSingle();
  if (!data?.refresh_token) {
    return { connected: false, email: null, refreshToken: null };
  }
  return {
    connected: true,
    email: (data.email as string | null) ?? null,
    refreshToken: data.refresh_token as string,
  };
}

export async function setGoogleConnection(
  email: string | null,
  refreshToken: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createAdminClient();
  const { error } = await supabase.from("google_oauth").upsert(
    {
      id: 1,
      email,
      refresh_token: refreshToken,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function clearGoogleConnection(): Promise<{
  ok: boolean;
  error?: string;
}> {
  const supabase = createAdminClient();
  const { error } = await supabase.from("google_oauth").delete().eq("id", 1);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
