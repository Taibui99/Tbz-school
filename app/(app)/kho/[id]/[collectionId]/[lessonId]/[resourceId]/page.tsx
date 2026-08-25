import { redirect } from "next/navigation";

export default async function ResourceDetailRedirectPage({
  params,
}: {
  params: Promise<{
    id: string;
    collectionId: string;
    lessonId: string;
    resourceId: string;
  }>;
}) {
  const { resourceId } = await params;
  redirect(`/tai-lieu/${encodeURIComponent(resourceId)}`);
}
