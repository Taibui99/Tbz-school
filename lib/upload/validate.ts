import type { ResourceType } from "@/lib/resource/validate";

export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB
export const MAX_USER_QUOTA_BYTES = 250 * 1024 * 1024; // 250 MB
export const MAX_USER_QUOTA_LABEL = `${Math.round(
  MAX_USER_QUOTA_BYTES / 1024 / 1024,
)} MB`;
export const MAX_FILENAME_LENGTH = 255;
export const UPLOAD_SESSION_STALE_MS = 20 * 60 * 1000; // 20 phút

const EXTENSION_TO_TYPE: Record<string, ResourceType> = {
  pdf: "pdf",
  doc: "doc",
  docx: "docx",
  ppt: "ppt",
  pptx: "pptx",
  xls: "xls",
  xlsx: "xlsx",
  png: "image",
  jpg: "image",
  jpeg: "image",
  gif: "image",
  webp: "image",
  svg: "image",
  mp4: "video",
  webm: "video",
  mov: "video",
  mp3: "audio",
  wav: "audio",
  ogg: "audio",
  txt: "text",
  md: "text",
  csv: "text",
};

const SUPPORTED_EXTENSIONS = Object.keys(EXTENSION_TO_TYPE);

export function extensionOf(fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  if (dot <= 0 || dot === fileName.length - 1) return "";
  return fileName.slice(dot + 1).toLowerCase();
}

export function resourceTypeFromFileName(fileName: string): ResourceType | null {
  const ext = extensionOf(fileName);
  return EXTENSION_TO_TYPE[ext] ?? null;
}

export function isSupportedExtension(ext: string): boolean {
  return SUPPORTED_EXTENSIONS.includes(ext.toLowerCase());
}

export interface UploadFileInput {
  fileName: string;
  sizeBytes: number;
}

export function validateUploadFile(input: UploadFileInput): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!input.fileName.trim()) {
    errors.fileName = "Vui lòng chọn tệp.";
    return errors;
  }

  if (input.fileName.length > MAX_FILENAME_LENGTH) {
    errors.fileName = `Tên tệp quá dài (tối đa ${MAX_FILENAME_LENGTH} ký tự).`;
  }

  const ext = extensionOf(input.fileName);
  if (!isSupportedExtension(ext)) {
    errors.fileName = `Loại tệp không hỗ trợ (.${ext || "?"}).`;
  }

  if (!Number.isFinite(input.sizeBytes) || input.sizeBytes <= 0) {
    errors.sizeBytes = "Kích thước tệp không hợp lệ.";
  } else if (input.sizeBytes > MAX_FILE_SIZE_BYTES) {
    errors.sizeBytes = `Tệp quá lớn (tối đa ${Math.round(MAX_FILE_SIZE_BYTES / 1024 / 1024)} MB).`;
  }

  return errors;
}

export function computeQuotaAfter(
  usedBytes: number,
  additionalBytes: number,
  quotaBytes = MAX_USER_QUOTA_BYTES,
): { allowed: boolean; usedAfter: number } {
  const usedAfter = usedBytes + additionalBytes;
  return { allowed: usedAfter <= quotaBytes, usedAfter };
}

export function isUploadSessionStale(
  updatedAt: string | Date,
  now: number = Date.now(),
  staleAfterMs = UPLOAD_SESSION_STALE_MS,
): boolean {
  const time = typeof updatedAt === "string" ? Date.parse(updatedAt) : updatedAt.getTime();
  if (!Number.isFinite(time)) return false;
  return now - time > staleAfterMs;
}