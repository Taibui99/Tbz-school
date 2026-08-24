import { createAdminClient } from "@/lib/supabase/admin";

export interface AdminUserRow {
  id: string;
  email: string | null;
  fullName: string | null;
  suspendedAt: string | null;
  createdAt: string;
}

export interface AdminResourceRow {
  id: string;
  title: string;
  visibility: string;
  lifecycleState: string;
  ownerId: string;
  hiddenAt: string | null;
  createdAt: string;
}

export interface AdminReportRow {
  id: string;
  resourceId: string | null;
  reason: string;
  category: string | null;
  status: string;
  createdAt: string;
  reporterEmail: string | null;
}

export async function getAdminOverview() {
  const admin = createAdminClient();

  const [users, resources, storage, pendingReports, recentAudit] =
    await Promise.all([
      admin.from("profiles").select("id", { count: "exact", head: true }),
      admin
        .from("resources")
        .select("id", { count: "exact", head: true })
        .eq("lifecycle_state", "ready")
        .is("deleted_at", null),
      admin
        .from("storage_usage")
        .select("bytes_used, file_count"),
      admin
        .from("reports")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending"),
      admin
        .from("audit_log")
        .select("id, action, target_type, target_id, details, created_at")
        .order("created_at", { ascending: false })
        .limit(15),
    ]);

  const bytesUsed = (storage.data ?? []).reduce(
    (sum, row) => sum + Number(row.bytes_used ?? 0),
    0,
  );
  const fileCount = (storage.data ?? []).reduce(
    (sum, row) => sum + Number(row.file_count ?? 0),
    0,
  );

  return {
    userCount: users.count ?? 0,
    resourceCount: resources.count ?? 0,
    bytesUsed,
    fileCount,
    pendingReports: pendingReports.count ?? 0,
    recentAudit: recentAudit.data ?? [],
  };
}

export async function listAdminUsers(limit = 100): Promise<AdminUserRow[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("id, email, full_name, suspended_at, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []).map((row) => ({
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    suspendedAt: row.suspended_at,
    createdAt: row.created_at,
  }));
}

export async function listAdminResources(limit = 50): Promise<AdminResourceRow[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("resources")
    .select("id, title, visibility, lifecycle_state, owner_id, hidden_at, created_at")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    visibility: row.visibility,
    lifecycleState: row.lifecycle_state,
    ownerId: row.owner_id,
    hiddenAt: row.hidden_at,
    createdAt: row.created_at,
  }));
}

export async function listPendingReports(limit = 50): Promise<AdminReportRow[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("reports")
    .select("id, resource_id, reason, category, status, created_at, profiles(email)")
    .in("status", ["pending", "reviewing"])
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []).map((row) => ({
    id: row.id,
    resourceId: row.resource_id,
    reason: row.reason,
    category: row.category,
    status: row.status,
    createdAt: row.created_at,
    reporterEmail:
      (row.profiles as { email?: string | null } | null)?.email ?? null,
  }));
}
