"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminUser } from "@/lib/youtube/store";
import type { ActionResult } from "@/lib/workspace/actions";
import { checkRateLimit } from "@/lib/security/rate-limit";

async function currentAdmin(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAdminUser(user)) return null;
  return user.id;
}

async function writeAudit(
  actorId: string,
  action: string,
  targetType: string,
  targetId: string,
  details?: Record<string, unknown>,
): Promise<void> {
  const admin = createAdminClient();
  await admin.from("audit_log").insert({
    actor_id: actorId,
    action,
    target_type: targetType,
    target_id: targetId,
    details: details ?? {},
  });
}

export async function suspendUserAction(
  formData: FormData,
): Promise<ActionResult> {
  const actorId = await currentAdmin();
  if (!actorId) return { error: "Chỉ quản trị viên mới thực hiện được." };

  const userId = String(formData.get("userId") ?? "");
  if (!userId) return { error: "Thiếu người dùng." };
  if (userId === actorId) {
    return { error: "Bạn không thể tự khóa tài khoản của mình." };
  }

  const rl = checkRateLimit(`admin:${actorId}`, 60, 60 * 60 * 1000);
  if (!rl.ok) return { error: "Quá nhiều thao tác. Thử lại sau ít phút." };

  const admin = createAdminClient();

  const { data: target } = await admin
    .from("profiles")
    .select("email")
    .eq("id", userId)
    .maybeSingle();
  if (!target) return { error: "Không tìm thấy người dùng." };

  const { error } = await admin
    .from("profiles")
    .update({ suspended_at: new Date().toISOString() })
    .eq("id", userId);
  if (error) return { error: error.message };

  await writeAudit(actorId, "user.suspend", "profile", userId, {
    email: target.email,
  });
  revalidatePath("/admin/users");
  return { success: "Đã khóa tài khoản." };
}

export async function restoreUserAction(
  formData: FormData,
): Promise<ActionResult> {
  const actorId = await currentAdmin();
  if (!actorId) return { error: "Chỉ quản trị viên mới thực hiện được." };

  const userId = String(formData.get("userId") ?? "");
  if (!userId) return { error: "Thiếu người dùng." };

  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ suspended_at: null })
    .eq("id", userId);
  if (error) return { error: error.message };

  await writeAudit(actorId, "user.restore", "profile", userId);
  revalidatePath("/admin/users");
  return { success: "Đã mở khóa tài khoản." };
}

export async function hideResourceAction(
  formData: FormData,
): Promise<ActionResult> {
  const actorId = await currentAdmin();
  if (!actorId) return { error: "Chỉ quản trị viên mới thực hiện được." };

  const resourceId = String(formData.get("resourceId") ?? "");
  if (!resourceId) return { error: "Thiếu tài liệu." };

  const rl = checkRateLimit(`admin:${actorId}`, 60, 60 * 60 * 1000);
  if (!rl.ok) return { error: "Quá nhiều thao tác. Thử lại sau ít phút." };

  const admin = createAdminClient();
  const { data: resource } = await admin
    .from("resources")
    .select("title")
    .eq("id", resourceId)
    .maybeSingle();
  if (!resource) return { error: "Không tìm thấy tài liệu." };

  const { error } = await admin
    .from("resources")
    .update({ hidden_at: new Date().toISOString() })
    .eq("id", resourceId);
  if (error) return { error: error.message };

  await writeAudit(actorId, "resource.hide", "resource", resourceId, {
    title: resource.title,
  });
  revalidatePath("/kham-pha");
  revalidatePath(`/thu-vien/${resourceId}`);
  revalidatePath("/admin/resources");
  return { success: `Đã ẩn "${resource.title}" khỏi thư viện công khai.` };
}

export async function unhideResourceAction(
  formData: FormData,
): Promise<ActionResult> {
  const actorId = await currentAdmin();
  if (!actorId) return { error: "Chỉ quản trị viên mới thực hiện được." };

  const resourceId = String(formData.get("resourceId") ?? "");
  if (!resourceId) return { error: "Thiếu tài liệu." };

  const admin = createAdminClient();
  const { error } = await admin
    .from("resources")
    .update({ hidden_at: null })
    .eq("id", resourceId);
  if (error) return { error: error.message };

  await writeAudit(actorId, "resource.unhide", "resource", resourceId);
  revalidatePath("/kham-pha");
  revalidatePath(`/thu-vien/${resourceId}`);
  revalidatePath("/admin/resources");
  return { success: "Đã bỏ ẩn tài liệu." };
}

export async function resolveReportAction(
  formData: FormData,
): Promise<ActionResult> {
  const actorId = await currentAdmin();
  if (!actorId) return { error: "Chỉ quản trị viên mới thực hiện được." };

  const reportId = String(formData.get("reportId") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const resolution = String(formData.get("resolution") ?? "").trim() || null;

  if (decision !== "resolved" && decision !== "rejected") {
    return { error: "Quyết định không hợp lệ." };
  }
  if (!reportId) return { error: "Thiếu báo cáo." };

  const rl = checkRateLimit(`admin:${actorId}`, 60, 60 * 60 * 1000);
  if (!rl.ok) return { error: "Quá nhiều thao tác. Thử lại sau ít phút." };

  const admin = createAdminClient();

  let hiddenResourceId: string | null = null;
  if (formData.get("alsoHide") === "1") {
    const { data: report } = await admin
      .from("reports")
      .select("resource_id")
      .eq("id", reportId)
      .maybeSingle();
    if (report?.resource_id) {
      const { data: resource } = await admin
        .from("resources")
        .select("hidden_at")
        .eq("id", report.resource_id)
        .maybeSingle();
      if (resource && !resource.hidden_at) {
        const { error: hideError } = await admin
          .from("resources")
          .update({ hidden_at: new Date().toISOString() })
          .eq("id", report.resource_id);
        if (hideError) return { error: hideError.message };
        hiddenResourceId = report.resource_id;
        await writeAudit(
          actorId,
          "resource.hide",
          "resource",
          report.resource_id,
          { viaReport: reportId },
        );
        revalidatePath("/kham-pha");
        revalidatePath(`/thu-vien/${report.resource_id}`);
      }
    }
  }

  const { error } = await admin
    .from("reports")
    .update({
      status: decision,
      resolution,
      handled_by: actorId,
      handled_at: new Date().toISOString(),
    })
    .eq("id", reportId);
  if (error) return { error: error.message };

  await writeAudit(actorId, "report.resolve", "report", reportId, {
    decision,
    hiddenResourceId,
  });
  revalidatePath("/admin/reports");
  return {
    success:
      decision === "resolved"
        ? "Đã xử lý báo cáo."
        : "Đã bỏ qua báo cáo.",
  };
}
