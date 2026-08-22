import { redirect } from "next/navigation";

export default async function CollectionRedirectPage({
  params,
}: {
  params: Promise<{ id: string; collectionId: string }>;
}) {
  const { id, collectionId } = await params;
  redirect(
    `/kho?w=${encodeURIComponent(id)}&c=${encodeURIComponent(collectionId)}`,
  );
}
