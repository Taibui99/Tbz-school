import { redirect } from "next/navigation";

export default async function WorkspaceRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // Phase 37: workspace cũ trở thành thư mục gốc (UUID được bảo toàn).
  redirect(`/kho?f=${encodeURIComponent(id)}`);
}
