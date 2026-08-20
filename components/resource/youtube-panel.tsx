"use client";

import { useActionState } from "react";
import Link from "next/link";
import { MonitorPlay, Play } from "lucide-react";
import { publishToYoutubeAction } from "@/lib/youtube/actions";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function YoutubePanel({
  resourceId,
  connected,
  connectedEmail,
  hasFile,
  alreadyPublished,
  isOwner,
}: {
  resourceId: string;
  connected: boolean;
  connectedEmail: string | null;
  hasFile: boolean;
  alreadyPublished: boolean;
  isOwner: boolean;
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
        Đưa bài giảng lên kênh TBZ School (unlisted) để phát mượt mà không tốn
        dung lượng lưu trữ.
      </p>

      {!connected ? (
        <p className="mt-3 text-sm text-muted-foreground">
          Kho video trung tâm chưa được kết nối. Quản trị viên kết nối tại{" "}
          <Link
            href="/ho-so"
            className="text-primary underline-offset-4 hover:underline"
          >
            trang cá nhân
          </Link>
          .
        </p>
      ) : !isOwner ? (
        <p className="mt-3 text-sm text-muted-foreground">
          Chỉ chủ sở hữu tài liệu mới đăng video lên kho trung tâm.
        </p>
      ) : hasFile ? (
        <>
          <form action={formAction} className="mt-3 flex flex-wrap items-center gap-3">
            <input type="hidden" name="resourceId" value={resourceId} />
            <Button type="submit" disabled={pending}>
              <Play aria-hidden="true" />
              {pending
                ? "Đang đăng lên kênh TBZ School..."
                : "Đăng lên kênh TBZ School (unlisted)"}
            </Button>
            <span className="text-xs text-muted-foreground">
              Kho trung tâm: {connectedEmail ?? "Tài khoản Google"}
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
    </section>
  );
}