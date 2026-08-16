"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/workspace/actions";

const REPORT_CATEGORIES = [
  "copyright",
  "spam",
  "inappropriate",
  "other",
] as const;

export async function reportResourceAction(
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const resourceId = String(formData.get("resourceId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  const category = String(formData.get("category") ?? "");

  if (reason.length < 10) {
    return { error: "Vui lòng nhập lý do báo cáo (tối thiểu 10 ký tự)." };
  }
  if (!REPORT_CATEGORIES.includes(category as (typeof REPORT_CATEGORIES)[number])) {
    return { error: "Hạng mục báo cáo không hợp lệ." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Chưa đăng nhập." };

  const { data: resource } = await supabase
    .from("resources")
    .select("id")
    .eq("id", resourceId)
    .eq("visibility", "public")
    .eq("lifecycle_state", "ready")
    .is("deleted_at", null)
    .maybeSingle();
  if (!resource) return { error: "Tài liệu công khai không tồn tại." };

  const { error } = await supabase.from("reports").insert({
    reporter_id: user.id,
    resource_id: resourceId,
    reason,
    category,
  });
  if (error) return { error: error.message };

  revalidatePath(`/thu-vien/${resourceId}`);
  return { success: "Đã gửi báo cáo. Cảm ơn bạn!" };
}