import { getStorageProvider, isSupportedProvider } from "@/lib/storage";

export type ViewerKind =
  | "pdf"
  | "video"
  | "image"
  | "audio"
  | "text"
  | "url"
  | "office"
  | "unsupported";

export type ViewerResult =
  | { kind: "pdf" | "image" | "audio" | "text"; url: string | null }
  | { kind: "video"; url: string | null; youtubeId?: string | null }
  | { kind: "url"; url: string | null }
  | { kind: "office" | "unsupported" };

export interface ViewContext {
  type: string;
  mime: string | null;
  lifecycle_state: string;
  provider: string | null;
  storage_key: string | null;
  external_url: string | null;
  youtube_id: string | null;
  deleted_at: string | null;
}

export function viewerKindFor(ctx: ViewContext): ViewerKind {
  if (ctx.deleted_at !== null) return "unsupported";
  if (ctx.type === "url" || ctx.external_url !== null) return "url";
  switch (ctx.type) {
    case "pdf":
      return "pdf";
    case "video":
      return "video";
    case "image":
      return "image";
    case "audio":
      return "audio";
    case "text":
      return "text";
    case "doc":
    case "docx":
    case "ppt":
    case "pptx":
    case "xls":
    case "xlsx":
      return "office";
    default:
      return "unsupported";
  }
}

export async function resolveViewer(ctx: ViewContext): Promise<ViewerResult> {
  const kind = viewerKindFor(ctx);
  if (kind === "url") return { kind, url: ctx.external_url };
  if (kind === "office" || kind === "unsupported") return { kind };
  if (kind === "video" && ctx.youtube_id) {
    return { kind: "video", url: null, youtubeId: ctx.youtube_id };
  }
  if (
    ctx.lifecycle_state !== "ready" ||
    !ctx.provider ||
    !ctx.storage_key ||
    !isSupportedProvider(ctx.provider)
  ) {
    return { kind, url: null };
  }
  try {
    const provider = getStorageProvider(ctx.provider);
    const url = await provider.getSignedReadUrl(ctx.storage_key, {
      expiresInSeconds: 3600,
    });
    return { kind, url };
  } catch {
    return { kind: "unsupported" };
  }
}