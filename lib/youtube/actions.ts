"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/workspace/actions";
import {
  getAccessToken,
  isGoogleConfigured,
  uploadVideoToYouTube,
} from "@/lib/youtube/client";
import {
  clearGoogleConnection,
  getGoogleConnection,
  isAdminUser,
} from "@/lib/youtube/store";
import { buildYoutubeVideoTitle } from "@/lib/youtube/title";
import { getStorageProvider, isSupportedProvider } from "@/lib/storage";

export async function publishToYoutubeAction(
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const resourceId = String(formData.get("resourceId") ?? "");
  if (!resourceId) return { error: "Thiếu tài liệu." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Chưa đăng nhập." };

  const { data: resource } = await supabase
    .from("resources")
    .select(
      "id, owner_id, type, title, description, lifecycle_state, provider, storage_key, mime, youtube_id, original_filename, workspace_id, lesson_id, lessons!inner(collection_id)",
    )
    .eq("id", resourceId)
    .maybeSingle();
  if (!resource) return { error: "Không tìm thấy tài liệu." };
  if (resource.owner_id !== user.id) {
    return { error: "Bạn không có quyền với tài liệu này." };
  }
  if (resource.type !== "video") {
    return { error: "Chỉ tài liệu video mới đăng lên YouTube." };
  }
  if (resource.youtube_id) {
    return { error: "Video này đã đăng lên YouTube." };
  }
  if (!isGoogleConfigured()) {
    return { error: "Chưa cấu hình Google OAuth." };
  }
  if (
    resource.lifecycle_state !== "ready" ||
    !resource.provider ||
    !resource.storage_key
  ) {
    return { error: "Video chưa có tệp để đăng lên YouTube." };
  }
  if (!isSupportedProvider(resource.provider)) {
    return { error: "Nhà cung cấp lưu trữ không hợp lệ." };
  }

  const connection = await getGoogleConnection();
  if (!connection.connected || !connection.refreshToken) {
    return {
      error:
        "Chưa kết nối tài khoản Google. Bấm 'Kết nối Google' trước rồi thử lại.",
    };
  }

  try {
    const accessToken = await getAccessToken(connection.refreshToken);

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .maybeSingle();

    const videoTitle = buildYoutubeVideoTitle({
      fullName: profile?.full_name,
      originalFilename: resource.original_filename,
      fallbackTitle: resource.title,
    });

    const provider = getStorageProvider(resource.provider);
    const readUrl = await provider.getSignedReadUrl(resource.storage_key, {
      expiresInSeconds: 300,
    });
    const fileRes = await fetch(readUrl);
    if (!fileRes.ok) {
      return { error: "Không tải được tệp video từ kho lưu trữ." };
    }
    const data = await fileRes.arrayBuffer();

    const videoId = await uploadVideoToYouTube({
      accessToken,
      title: videoTitle,
      description: resource.description ?? "",
      mime: resource.mime ?? "video/mp4",
      data,
    });

    const { error } = await supabase
      .from("resources")
      .update({ youtube_id: videoId })
      .eq("id", resource.id);
    if (error) return { error: error.message };

    const lessons = Array.isArray(resource.lessons)
      ? resource.lessons[0]
      : resource.lessons;
    if (resource.workspace_id && resource.lesson_id && lessons?.collection_id) {
      revalidatePath(
        `/kho/${resource.workspace_id}/${lessons.collection_id}/${resource.lesson_id}/${resource.id}`,
      );
    }
    return {
      success: "Đã đăng video lên YouTube (chế độ unlisted).",
    };
  } catch (err) {
    const message =
      err instanceof Error && err.message
        ? err.message
        : "Đăng lên YouTube thất bại.";
    return { error: message };
  }
}

export async function disconnectGoogleAction(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  if (!isAdminUser(user)) return;

  await clearGoogleConnection();
  revalidatePath("/", "layout");
}