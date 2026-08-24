import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Sau khi phiên đăng nhập được thiết lập, kiểm tra tài khoản có bị khóa
 * không. Nếu bị khóa thì hủy phiên ngay và chuyển về trang đăng nhập.
 */
export async function signOutIfSuspended(
  supabase: SupabaseClient,
  userId: string,
  loginUrl: string,
): Promise<void> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("suspended_at")
    .eq("id", userId)
    .maybeSingle();

  if (profile?.suspended_at) {
    await supabase.auth.signOut();
    redirect(`${loginUrl}?error=suspended`);
  }
}
