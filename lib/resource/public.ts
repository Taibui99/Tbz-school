import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

export interface PublicOwner {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

/**
 * Tra cứu tài liệu công khai qua liên kết chia sẻ (unlisted).
 * Dùng security-definer function `get_public_resource_by_token` để
 * không phụ thuộc RLS của caller — chỉ trả tài liệu unlisted/ready.
 */
export async function getResourceByToken(token: string) {
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_public_resource_by_token", {
    p_token: token,
  });
  if (!data || data.length === 0) return null;
  return data[0] as Record<string, unknown> & { id: string };
}

/** Lấy họ tên/avatar chủ sở hữu cho trang công khai (server-side). */
export async function getOwnerInfo(ownerId: string): Promise<PublicOwner | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("id, full_name, avatar_url")
    .eq("id", ownerId)
    .maybeSingle();
  if (!data) return null;
  return {
    id: data.id,
    full_name: data.full_name,
    avatar_url: data.avatar_url,
  };
}

/** Lấy danh sách họ tên/avatar theo danh sách id (server-side, bỏ qua RLS). */
export async function getOwnersByIds(ids: string[]): Promise<PublicOwner[]> {
  if (ids.length === 0) return [];
  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("id, full_name, avatar_url")
    .in("id", ids);
  if (!data) return [];
  return data.map((row) => ({
    id: row.id,
    full_name: row.full_name,
    avatar_url: row.avatar_url,
  }));
}

/** Đọc token liên kết + danh sách grant của một tài liệu (owner). */
export async function getShareInfo(supabase: SupabaseClient, resourceId: string) {
  const { data: shares } = await supabase
    .from("resource_shares")
    .select("id, granted_to, permission_level, token, expires_at")
    .eq("resource_id", resourceId);

  const rows = shares ?? [];
  const link = rows.find(
    (row) => row.token !== null && row.granted_to === null,
  );
  const grants = rows.filter((row) => row.granted_to !== null);
  const ownerInfos = await getOwnersByIds(
    grants.map((row) => row.granted_to!).filter(Boolean),
  );
  const ownerById = new Map(ownerInfos.map((o) => [o.id, o]));

  return {
    linkToken: link?.token ?? null,
    grants: grants.map((row) => ({
      id: row.id,
      grantedTo: row.granted_to!,
      permissionLevel: row.permission_level,
      name: ownerById.get(row.granted_to!)?.full_name ?? null,
    })),
  };
}