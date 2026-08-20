export type DownloadVerdict =
  | { allowed: true }
  | { allowed: false; reason: "external" | "not-ready" | "no-file" | "deleted" };

export interface DownloadContext {
  type: string;
  lifecycleState: string;
  deletedAt: string | null;
  provider: string | null;
  storageKey: string | null;
  externalUrl: string | null;
  youtubeId?: string | null;
}

/**
 * Quy tắc tải về (PRD §6, ARCHITECTURE §17):
 * - Tài liệu ngoài (url/external): không tải qua TBZ School trừ khi
 *   provider cho phép — hiện tại luôn chặn.
 * - Video đã đăng lên YouTube: phát qua YouTube, không tải file gốc.
 * - Tài liệu dạng tệp: chỉ tải khi lifecycle 'ready', có storage, chưa xóa.
 */
export function evaluateDownload(input: DownloadContext): DownloadVerdict {
  if (input.deletedAt !== null) return { allowed: false, reason: "deleted" };

  if (
    input.type === "url" ||
    input.externalUrl !== null ||
    Boolean(input.youtubeId)
  ) {
    return { allowed: false, reason: "external" };
  }

  if (input.lifecycleState !== "ready") {
    return { allowed: false, reason: "not-ready" };
  }

  if (!input.provider || !input.storageKey) {
    return { allowed: false, reason: "no-file" };
  }

  return { allowed: true };
}