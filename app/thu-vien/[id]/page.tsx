import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getOwnerInfo } from "@/lib/resource/public";
import { evaluateDownload } from "@/lib/resource/download";
import { resolveViewer } from "@/lib/resource/view";
import {
  PublicResourceBody,
  type PublicResource,
} from "@/components/resource/public-resource-body";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Tài liệu công khai",
  description: "Tài liệu công khai trên TBZ School.",
};

export default async function PublicResourcePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: row } = await supabase
    .from("resources")
    .select(
      "id, owner_id, title, description, type, visibility, mime, original_filename, lifecycle_state, provider, storage_key, external_url, youtube_id, created_at",
    )
    .eq("id", id)
    .eq("visibility", "public")
    .eq("lifecycle_state", "ready")
    .is("deleted_at", null)
    .maybeSingle();
  if (!row) notFound();

  const resource: PublicResource = row;

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
      original_filename: resource.original_filename,
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