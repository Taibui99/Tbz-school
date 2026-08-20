import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AvatarUpload, ProfileInfo } from "@/components/profile/profile-form";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { GoogleConnectCard } from "@/components/profile/google-connect-card";
import { getGoogleConnection, isAdminUser } from "@/lib/youtube/store";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Hồ sơ",
  description: "Quản lý thông tin tài khoản TBZ School.",
};

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/dang-nhap");
  }

  const sp = await searchParams;
  const googleNotice = typeof sp.google === "string" ? sp.google : null;
  const userIsAdmin = isAdminUser(user);
  const googleConnection = userIsAdmin ? await getGoogleConnection() : null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, avatar_url")
    .eq("id", user.id)
    .single();

  let avatarUrl: string | null = null;
  if (profile?.avatar_url) {
    avatarUrl = supabase.storage
      .from("avatars")
      .getPublicUrl(profile.avatar_url).data.publicUrl;
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">Hồ sơ</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Quản lý thông tin cá nhân và ảnh đại diện của bạn.
      </p>

      <div className="mt-6 flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Ảnh đại diện</CardTitle>
            <CardDescription>
              Ảnh hiển thị công khai — chỉ chấp nhận file ảnh, tối đa 2 MB.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AvatarUpload userId={user.id} avatarUrl={avatarUrl} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Thông tin tài khoản</CardTitle>
            <CardDescription>
              Email không thể thay đổi — dùng để đăng nhập.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ProfileInfo email={user.email ?? ""} fullName={profile?.full_name ?? ""} />
          </CardContent>
        </Card>

        {userIsAdmin && (
          <Card>
            <CardHeader>
              <CardTitle>Đăng video lên YouTube</CardTitle>
              <CardDescription>
                Kết nối tài khoản Google quản lý kho video trung tâm của TBZ
                School.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <GoogleConnectCard
                connected={googleConnection?.connected ?? false}
                email={googleConnection?.email ?? null}
                notice={googleNotice}
              />
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Đổi mật khẩu</CardTitle>
            <CardDescription>
              Cập nhật mật khẩu đăng nhập của bạn.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResetPasswordForm />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}