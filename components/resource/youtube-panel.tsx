"use client";

import { useActionState } from "react";
import { MonitorPlay, Play } from "lucide-react";
import {
  disconnectGoogleAction,
  publishToYoutubeAction,
} from "@/lib/youtube/actions";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function YoutubePanel({
  resourceId,
  connected,
  connectedEmail,
  hasFile,
  alreadyPublished,
}: {
  resourceId: string;
  connected: boolean;
  connectedEmail: string | null;
  hasFile: boolean;
  alreadyPublished: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    publishToYoutubeAction,
    {},
  );

  if (alreadyPublished) {
    return (
      <section className="mt-6 rounded-xl border border-border bg-card p-4">
        <h2 className="flex items-center gap-2 text-sm font-medium">
          <MonitorPlay aria-hidden="true" className="size-4 text-destructive" />
          YouTube
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Video đang phát qua YouTube (unlisted) — không tốn dung lượng lưu trữ.
        </p>
      </section>
    );
  }

  return (
    <section className="mt-6 rounded-xl border border-border bg-card p-4">
      <h2 className="flex items-center gap-2 text-sm font-medium">
        <MonitorPlay aria-hidden="true" className="size-4 text-destructive" />
        Đăng lên YouTube
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Đưa bài giảng lên YouTube (chế độ unlisted) để phát mượt mà không tốn
        dung lượng lưu trữ của TBZ School.
      </p>

      {!connected ? (
        <div className="mt-3">
          <Button render={<a href="/api/auth/google/start" />}>
            Kết nối Google
          </Button>
          <p className="mt-2 text-xs text-muted-foreground">
            Kết nối 1 lần bằng tài khoản Google quản lý kênh. Mọi video sẽ được
            đăng lên kênh đó (unlisted).
          </p>
        </div>
      ) : hasFile ? (
        <>
          <form action={formAction} className="mt-3 flex flex-wrap items-center gap-3">
            <input type="hidden" name="resourceId" value={resourceId} />
            <Button type="submit" disabled={pending}>
              <Play aria-hidden="true" />
              {pending ? "Đang đăng lên YouTube..." : "Đăng lên YouTube (unlisted)"}
            </Button>
            <span className="text-xs text-muted-foreground">
              Kênh: {connectedEmail ?? "Tài khoản Google"}
            </span>
          </form>
          {state.error && (
            <Alert variant="destructive" className="mt-3">
              <AlertTitle>Lỗi</AlertTitle>
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          )}
          {state.success && (
            <Alert className="mt-3">
              <AlertTitle>Thành công</AlertTitle>
              <AlertDescription>{state.success}</AlertDescription>
            </Alert>
          )}
        </>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">
          Video cần có tệp mp4 để đăng lên YouTube.
        </p>
      )}

      {connected && (
        <form action={disconnectGoogleAction} className="mt-3">
          <Button variant="ghost" size="sm" type="submit">
            Ngắt kết nối Google
          </Button>
        </form>
      )}
    </section>
  );
}