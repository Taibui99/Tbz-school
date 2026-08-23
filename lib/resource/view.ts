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
  | {
      kind: "office";
      url: string | null;
      previewType: OfficePreviewKind | null;
    }
  | { kind: "unsupported" };

export type OfficePreviewKind = "docx" | "xlsx" | "xls" | "pptx";

const OFFICE_PREVIEW_RULES: Array<{
  target: OfficePreviewKind;
  mimePattern: RegExp;
  extensions: string[];
}> = [
  {
    target: "docx",
    mimePattern: /wordprocessingml\.document/i,
    extensions: [".docx"],
  },
  {
    target: "xlsx",
    mimePattern: /spreadsheetml\.sheet/i,
    extensions: [".xlsx"],
  },
  {
    target: "xls",
    mimePattern: /ms-excel/i,
    extensions: [".xls"],
  },
  {
    target: "pptx",
    mimePattern: /presentationml\.presentation/i,
    extensions: [".pptx"],
  },
];

export function officePreviewKind(ctx: {
  mime: string | null;
  original_filename?: string | null;
}): OfficePreviewKind | null {
  for (const rule of OFFICE_PREVIEW_RULES) {
    if (ctx.mime && rule.mimePattern.test(ctx.mime)) return rule.target;
    const name = (ctx.original_filename ?? "").trim().toLowerCase();
    if (rule.extensions.some((ext) => name.endsWith(ext))) return rule.target;
  }
  return null;
}

export interface ViewContext {
  type: string;
  mime: string | null;
  lifecycle_state: string;
  provider: string | null;
  storage_key: string | null;
  external_url: string | null;
  youtube_id: string | null;
  deleted_at: string | null;
  original_filename?: string | null;
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
  if (kind === "unsupported") return { kind };

  const skipSigning = kind === "video" && !!ctx.youtube_id;
  let url: string | null = null;
  if (
    !skipSigning &&
    ctx.lifecycle_state === "ready" &&
    ctx.provider &&
    ctx.storage_key &&
    isSupportedProvider(ctx.provider)
  ) {
    const providerName = ctx.provider;
    const storageKey = ctx.storage_key;
    try {
      const provider = getStorageProvider(providerName);
      url = await provider.getSignedReadUrl(storageKey, {
        expiresInSeconds: 3600,
      });
    } catch (error) {
      console.error(
        "[viewer] Không ký được URL đọc:",
        { provider: providerName, kind },
        error,
      );
      url = null;
    }
  }

  if (kind === "video" && ctx.youtube_id) {
    return { kind: "video", url: null, youtubeId: ctx.youtube_id };
  }
  if (kind === "office") {
    return {
      kind,
      url,
      previewType: url !== null ? officePreviewKind(ctx) : null,
    };
  }
  return { kind, url };
}