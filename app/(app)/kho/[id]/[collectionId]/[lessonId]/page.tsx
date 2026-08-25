import { redirect } from "next/navigation";

export default async function LessonRedirectPage({
  params,
}: {
  params: Promise<{ id: string; collectionId: string; lessonId: string }>;
}) {
  const { lessonId } = await params;
  // Phase 37: lesson cũ trở thành thư mục (UUID được bảo toàn khi chuyển đổi).
  redirect(`/kho?f=${encodeURIComponent(lessonId)}`);
}
