"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { validateCredentials } from "@/lib/auth/validate";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { signOutIfSuspended } from "@/lib/auth/guards";

export type AuthResult = {
  error?: string;
  success?: string;
  fieldErrors?: Record<string, string>;
};

const LOGIN_ATTEMPTS_LIMIT = 10;
const LOGIN_ATTEMPTS_WINDOW_MS = 15 * 60 * 1000;

function getRedirectPath(formData: FormData): string {
  const redirectTo = String(formData.get("redirect") ?? "");
  return redirectTo.startsWith("/") && !redirectTo.startsWith("//")
    ? redirectTo
    : "/";
}

export async function signUpAction(
  _prevState: AuthResult,
  formData: FormData,
): Promise<AuthResult> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("fullName") ?? "");

  const fieldErrors = validateCredentials({ email, password, fullName });
  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: {
      data: { full_name: fullName.trim() },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/confirm?next=/ho-so`,
    },
  });

  if (error) return { error: error.message };

  if (data.session) {
    const { error: profileError } = await supabase
      .from("profiles")
      .update({ full_name: fullName.trim() })
      .eq("id", data.user!.id);
    if (profileError) return { error: profileError.message };
    redirect(getRedirectPath(formData));
  }

  return {
    success:
      "Đã gửi email xác nhận. Vui lòng kiểm tra hộp thư để kích hoạt tài khoản.",
  };
}

export async function signInAction(
  _prevState: AuthResult,
  formData: FormData,
): Promise<AuthResult> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  const fieldErrors = validateCredentials({ email, password });
  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors };
  }

  const normalizedEmail = email.trim().toLowerCase();
  const rl = checkRateLimit(
    `login:${normalizedEmail}`,
    LOGIN_ATTEMPTS_LIMIT,
    LOGIN_ATTEMPTS_WINDOW_MS,
  );
  if (!rl.ok) {
    return {
      error: `Đăng nhập thất bại quá nhiều lần. Thử lại sau ${Math.ceil(rl.retryAfterSec / 60)} phút.`,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: normalizedEmail,
    password,
  });

  if (error) return { error: error.message };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) await signOutIfSuspended(supabase, user.id, "/dang-nhap");
  redirect(getRedirectPath(formData));
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function forgotPasswordAction(
  _prevState: AuthResult,
  formData: FormData,
): Promise<AuthResult> {
  const email = String(formData.get("email") ?? "");

  const emailError = validateCredentials({ email, password: "xxxxxx" }).email;
  if (emailError) return { fieldErrors: { email: emailError } };

  const rl = checkRateLimit(
    `forgot:${email.trim().toLowerCase()}`,
    5,
    15 * 60 * 1000,
  );
  if (!rl.ok) {
    return {
      error: `Bạn đã yêu cầu quá nhiều lần. Thử lại sau ${Math.ceil(rl.retryAfterSec / 60)} phút.`,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/confirm?next=/dat-lai-mat-khau`,
  });

  if (error) return { error: error.message };

  return {
    success: "Đã gửi email đặt lại mật khẩu. Kiểm tra hộp thư của bạn.",
  };
}

export async function updatePasswordAction(
  _prevState: AuthResult,
  formData: FormData,
): Promise<AuthResult> {
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  const passwordError = validateCredentials({
    email: "x@x.com",
    password,
  }).password;
  if (passwordError) return { fieldErrors: { password: passwordError } };
  if (password !== confirmPassword) {
    return { fieldErrors: { confirmPassword: "Mật khẩu xác nhận không khớp." } };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message };

  return { success: "Mật khẩu đã được cập nhật. Bạn có thể đăng nhập lại." };
}

export async function updateProfileAction(
  _prevState: AuthResult,
  formData: FormData,
): Promise<AuthResult> {
  const fullName = String(formData.get("fullName") ?? "").trim();

  if (!fullName) return { fieldErrors: { fullName: "Vui lòng nhập họ tên." } };
  if (fullName.length > 100) {
    return { fieldErrors: { fullName: "Họ tên quá dài (tối đa 100 ký tự)." } };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Chưa đăng nhập." };

  const { error } = await supabase
    .from("profiles")
    .update({ full_name: fullName })
    .eq("id", user.id);
  if (error) return { error: error.message };

  revalidatePath("/ho-so");
  return { success: "Đã lưu thông tin." };
}

export async function updateAvatarAction(formData: FormData): Promise<AuthResult> {
  const avatarPath = String(formData.get("avatarPath") ?? "").trim();
  if (!avatarPath) return { error: "Thiếu đường dẫn ảnh đại diện." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Chưa đăng nhập." };

  const { error } = await supabase
    .from("profiles")
    .update({ avatar_url: avatarPath })
    .eq("id", user.id);
  if (error) return { error: error.message };

  revalidatePath("/ho-so");
  return { success: "Đã cập nhật ảnh đại diện." };
}