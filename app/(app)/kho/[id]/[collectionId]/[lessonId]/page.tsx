import { redirect } from "next/navigation";

export default async function LessonRedirectPage({
  params,
}: {
  params: Promise<{ id: string; collectionId: string; lessonId: string }>;
}) {
  const { id, collectionId, lessonId } = await params;
  redirect(
    `/kho?w=${encodeURIComponent(id)}&c=${encodeURIComponent(collectionId)}&l=${encodeURIComponent(lessonId)}`,
  );
}
