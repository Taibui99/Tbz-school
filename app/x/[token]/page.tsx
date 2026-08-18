import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getResourceByToken, getOwnerInfo } from "@/lib/resource/public";
import { evaluateDownload } from "@/lib/resource/download";
import { resolveViewer } from "@/lib/resource/view";
import {
  PublicResourceBody,
  type PublicResource,
} from "@/components/resource/public-resource-body";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Tài liệu chia sẻ",
  description: "Tài liệu được chia sẻ qua liên kết trên TBZ School.",
};

export default async function SharedLinkPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const row = await getResourceByToken(token);
  if (!row) notFound();

  const resource: PublicResource = {
    id: row.id,
    owner_id: row.owner_id as string,
    title: row.title as string,
    description: (row.description as string | null) ?? null,
    type: row.type as string,
    visibility: row.visibility as string,
    mime: (row.mime as string | null) ?? null,
    lifecycle_state: row.lifecycle_state as string,
    provider: (row.provider as string | null) ?? null,
    storage_key: (row.storage_key as string | null) ?? null,
    external_url: (row.external_url as string | null) ?? null,
    youtube_id: (row.youtube_id as string | null) ?? null,
    created_at: (row.created_at as string | null) ?? null,
  };

  const [owner, viewer] = await Promise.all([
    getOwnerInfo(resource.owner_id),
    resolveViewer({
      type: resource.type,
      mime: resource.mime,
      lifecycle_state: resource.lifecycle_state,
      provider: resource.provider,
      storage_key: resource.storage_key,
      external_url: resource.external_url,
      youtube_id: resource.youtube_id,
      deleted_at: null,
    }),
  ]);

  const verdict = evaluateDownload({
    type: resource.type,
    lifecycleState: resource.lifecycle_state,
    deletedAt: null,
    provider: resource.provider,
    storageKey: resource.storage_key,
    externalUrl: resource.external_url,
  });
  const downloadUrl =
    verdict.allowed && "url" in viewer && viewer.url ? viewer.url : null;

  let favorite = false;
  if (user) {
    const { data: fav } = await supabase
      .from("favorites")
      .select("id")
      .eq("resource_id", resource.id)
      .eq("user_id", user.id)
      .maybeSingle();
    favorite = fav !== null;
  }

  return (
    <PublicResourceBody
      resource={resource}
      owner={owner}
      viewer={viewer}
      downloadUrl={downloadUrl}
      downloadReason={verdict.allowed ? null : verdict.reason}
      favorite={favorite}
      currentUserId={user?.id ?? null}
    />
  );
}