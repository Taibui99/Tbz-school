"use client";

import { MonitorPlay } from "lucide-react";
import { disconnectGoogleAction } from "@/lib/youtube/actions";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const NOTICES: Record<string, { title: string; message: string }> = {
  connected: {
    title: "Đã kết nối",
    message: "Tài khoản Google đã sẵn sàng để đăng video lên YouTube.",
  },
  error: {
    title: "Kết nối thất bại",
    message: "Không hoàn tất được việc kết nối Google. Vui lòng thử lại.",
  },
  "not-configured": {
    title: "Chưa cấu hình",
    message: "Google OAuth chưa được cấu hình trên máy chủ.",
  },
  forbidden: {
    title: "Không được phép",
    message:
      "Chỉ quản trị viên mới được kết nối tài khoản kho video trung tâm.",
  },
};

export function GoogleConnectCard({
  connected,
  email,
  notice,
}: {
  connected: boolean;
  email: string | null;
  notice: string | null;
}) {
  const info = notice ? NOTICES[notice] : null;

  return (
    <div className="flex flex-col gap-3">
      {info && (
        <Alert variant={notice === "connected" ? "default" : "destructive"}>
          <AlertTitle>{info.title}</AlertTitle>
          <AlertDescription>{info.message}</AlertDescription>
        </Alert>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <MonitorPlay aria-hidden="true" className="size-5 text-destructive" />
        {connected ? (
          <>
            <p className="text-sm text-muted-foreground">
              Kết nối với{" "}
              <span className="font-medium text-foreground">
                {email ?? "tài khoản Google"}
              </span>{" "}
              — video sẽ được đăng lên kênh này (unlisted).
            </p>
            <form action={disconnectGoogleAction}>
              <Button variant="outline" size="sm" type="submit">
                Ngắt kết nối
              </Button>
            </form>
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Kết nối tài khoản Google để đăng bài giảng video lên YouTube
              (unlisted) — không tốn dung lượng lưu trữ.
            </p>
            <Button size="sm" render={<a href="/api/auth/google/start" />}>
              Kết nối Google
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
