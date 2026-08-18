const YOUTUBE_TITLE_MAX = 100;

export function buildYoutubeVideoTitle(input: {
  fullName?: string | null;
  originalFilename?: string | null;
  fallbackTitle?: string | null;
}): string {
  const name =
    (input.fullName ?? "").trim() ||
    "User";
  const file =
    (input.originalFilename ?? "").trim() ||
    (input.fallbackTitle ?? "").trim() ||
    "Video";
  return `[${name} | TBZ School | ${file}]`.slice(0, YOUTUBE_TITLE_MAX);
}
