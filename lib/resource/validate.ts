export const RESOURCE_TYPES = [
  "pdf",
  "doc",
  "docx",
  "ppt",
  "pptx",
  "xls",
  "xlsx",
  "image",
  "video",
  "audio",
  "text",
  "url",
] as const;

export type ResourceType = (typeof RESOURCE_TYPES)[number];

export const VISIBILITIES = ["private", "unlisted", "public", "shared"] as const;

export type Visibility = (typeof VISIBILITIES)[number];

export const MAX_TITLE_LENGTH = 200;
export const MAX_DESCRIPTION_LENGTH = 1000;
export const MAX_URL_LENGTH = 2048;
export const MAX_TAGS_PER_RESOURCE = 12;

export function isResourceType(value: string): value is ResourceType {
  return (RESOURCE_TYPES as readonly string[]).includes(value);
}

export function isVisibility(value: string): value is Visibility {
  return (VISIBILITIES as readonly string[]).includes(value);
}

export function validateTitle(title: string): string | null {
  const value = title.trim();
  if (!value) return "Vui lòng nhập tiêu đề.";
  if (value.length > MAX_TITLE_LENGTH) {
    return `Tiêu đề quá dài (tối đa ${MAX_TITLE_LENGTH} ký tự).`;
  }
  return null;
}

export function validateDescription(description: string): string | null {
  if (description.length > MAX_DESCRIPTION_LENGTH) {
    return `Mô tả quá dài (tối đa ${MAX_DESCRIPTION_LENGTH} ký tự).`;
  }
  return null;
}

export function validateUrl(url: string): string | null {
  const value = url.trim();
  if (!value) return "Vui lòng nhập đường dẫn.";
  if (value.length > MAX_URL_LENGTH) {
    return `Đường dẫn quá dài (tối đa ${MAX_URL_LENGTH} ký tự).`;
  }
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return "Đường dẫn không hợp lệ.";
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return "Đường dẫn phải bắt đầu bằng http:// hoặc https://.";
  }
  return null;
}

export function validateTags(tagIds: string[]): string | null {
  const unique = new Set(tagIds);
  if (unique.size > MAX_TAGS_PER_RESOURCE) {
    return `Mỗi tài liệu tối đa ${MAX_TAGS_PER_RESOURCE} thẻ.`;
  }
  for (const id of unique) {
    const trimmed = id.trim();
    if (!trimmed) return "Thẻ không hợp lệ.";
    if (trimmed.length > 36) return "Thẻ không hợp lệ.";
  }
  return null;
}

export function validateResourceForm(input: {
  title: string;
  description?: string;
  type: string;
  visibility: string;
  url?: string;
}): Record<string, string> {
  const errors: Record<string, string> = {};

  const titleError = validateTitle(input.title);
  if (titleError) errors.title = titleError;

  if (input.description !== undefined) {
    const descriptionError = validateDescription(input.description);
    if (descriptionError) errors.description = descriptionError;
  }

  if (!isResourceType(input.type)) errors.type = "Loại tài liệu không hợp lệ.";

  if (!isVisibility(input.visibility)) {
    errors.visibility = "Chế độ hiển thị không hợp lệ.";
  }

  if (input.type === "url") {
    const urlError = validateUrl(input.url ?? "");
    if (urlError) errors.url = urlError;
  }

  return errors;
}