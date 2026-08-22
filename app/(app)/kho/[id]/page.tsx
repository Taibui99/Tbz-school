import { redirect } from "next/navigation";

export default async function WorkspaceRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/kho?w=${encodeURIComponent(id)}`);
}
