"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type AnnotationRow = {
  id: string;
  annotation_type: string;
  page: number | null;
  time_position: number | null;
  content: string | null;
  created_at: string;
  updated_at: string;
};

const TYPES = new Set(["text", "sticky", "bookmark", "note"]);
const MAX_CONTENT = 2000;

export type AnnotationActionResult = {
  success?: string;
  error?: string;
};

function readContent(value: FormDataEntryValue | null): string {
  if (typeof value !== "string") return "";
  return value.slice(0, MAX_CONTENT);
}

export async function createAnnotationAction(
  _prev: AnnotationActionResult,
  formData: FormData,
): Promise<AnnotationActionResult> {
  const resourceId = String(formData.get("resourceId") ?? "").trim();
  const type = String(formData.get("type") ?? "note").trim();
  const content = readContent(formData.get("content")).trim();
  const pageRaw = String(formData.get("page") ?? "").trim();
  const timeRaw = String(formData.get("timePosition") ?? "").trim();

  if (!TYPES.has(type)) return { error: "Loại ghi chú không hợp lệ." };
  if (!content && type !== "bookmark")
    return { error: "Nội dung không được để trống." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Bạn cần đăng nhập." };

  const { data: resource } = await supabase
    .from("resources")
    .select("id")
    .eq("id", resourceId)
    .maybeSingle();
  if (!resource) return { error: "Không tìm thấy tài liệu." };

  let page: number | null = null;
  let timePosition: number | null = null;
  if (pageRaw) {
    const n = Number(pageRaw);
    if (Number.isInteger(n) && n >= 1) page = n;
  }
  if (timeRaw) {
    const t = Number(timeRaw);
    if (Number.isFinite(t) && t >= 0) timePosition = Math.floor(t);
  }

  const { error } = await supabase
    .from("annotations")
    .insert({
      resource_id: resourceId,
      user_id: user.id,
      annotation_type: type,
      page,
      time_position: timePosition,
      content: content || null,
    })
    .select("id")
    .single();
  if (error) return { error: "Không lưu được ghi chú." };

  revalidatePath("/kho", "layout");
  return { success: "Đã lưu ghi chú." };
}

export async function updateAnnotationAction(
  _prev: AnnotationActionResult,
  formData: FormData,
): Promise<AnnotationActionResult> {
  const id = String(formData.get("id") ?? "").trim();
  const content = readContent(formData.get("content")).trim();
  if (!id) return { error: "Thiếu mã ghi chú." };
  if (!content) return { error: "Nội dung không được để trống." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Bạn cần đăng nhập." };

  const { data: existing } = await supabase
    .from("annotations")
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!existing) return { error: "Không tìm thấy ghi chú." };

  const { error } = await supabase
    .from("annotations")
    .update({ content })
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return { error: "Không cập nhật được ghi chú." };

  revalidatePath("/kho", "layout");
  return { success: "Đã cập nhật ghi chú." };
}

export async function deleteAnnotationAction(
  _prev: AnnotationActionResult,
  formData: FormData,
): Promise<AnnotationActionResult> {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { error: "Thiếu mã ghi chú." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Bạn cần đăng nhập." };

  const { error } = await supabase
    .from("annotations")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return { error: "Không xóa được ghi chú." };

  revalidatePath("/kho", "layout");
  return { success: "Đã xóa ghi chú." };
}

export async function getAnnotationsAction(
  resourceId: string,
): Promise<AnnotationRow[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("annotations")
    .select(
      "id, annotation_type, page, time_position, content, created_at, updated_at",
    )
    .eq("resource_id", resourceId)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (data ?? []).map((row) => ({
    id: row.id,
    annotation_type: row.annotation_type,
    page: row.page,
    time_position: row.time_position == null ? null : Number(row.time_position),
    content: row.content,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }));
}