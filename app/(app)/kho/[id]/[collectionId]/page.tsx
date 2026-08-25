import { redirect } from "next/navigation";

export default async function CollectionRedirectPage({
  params,
}: {
  params: Promise<{ id: string; collectionId: string }>;
}) {
  const { collectionId } = await params;
  // Phase 37: collection cũ trở thành thư mục (UUID được bảo toàn khi chuyển đổi).
  redirect(`/kho?f=${encodeURIComponent(collectionId)}`);
}
