import { randomBytes } from "crypto";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const OAUTH_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const UPLOAD_URL = "https://www.googleapis.com/upload/youtube/v3/videos";

export const YOUTUBE_SCOPE = "https://www.googleapis.com/auth/youtube.upload";

export class YoutubeError extends Error {
  constructor(message: string, readonly detail?: string) {
    super(message);
    this.name = "YoutubeError";
  }
}

export function isGoogleConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET,
  );
}

export function getGoogleClientId(): string | null {
  return process.env.GOOGLE_CLIENT_ID ?? null;
}

export function buildConsentUrl(redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID ?? "",
    redirect_uri: redirectUri,
    response_type: "code",
    scope: YOUTUBE_SCOPE,
    access_type: "offline",
    prompt: "consent",
    state,
    include_granted_scopes: "true",
  });
  return `${OAUTH_AUTH_URL}?${params.toString()}`;
}

export async function exchangeCodeForTokens(
  code: string,
  redirectUri: string,
): Promise<{ access_token: string; refresh_token: string; email?: string }> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) {
    throw new YoutubeError(
      `Trao đổi mã OAuth thất bại (${res.status}).`,
      await res.text().catch(() => ""),
    );
  }
  const data = await res.json();
  if (!data.access_token || !data.refresh_token) {
    throw new YoutubeError("Phản hồi OAuth thiếu token.", JSON.stringify(data));
  }
  return data as { access_token: string; refresh_token: string; email?: string };
}

export async function getAccessToken(refreshToken: string): Promise<string> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) {
    throw new YoutubeError(
      `Làm mới access token thất bại (${res.status}).`,
      await res.text().catch(() => ""),
    );
  }
  const data = await res.json();
  if (!data.access_token) {
    throw new YoutubeError("Không nhận được access token.");
  }
  return data.access_token as string;
}

export interface YoutubeUploadInput {
  accessToken: string;
  title: string;
  description: string;
  mime: string;
  data: ArrayBuffer;
}

export async function uploadVideoToYouTube(
  input: YoutubeUploadInput,
): Promise<string> {
  const metadata = {
    snippet: {
      title: input.title.slice(0, 100),
      description: input.description.slice(0, 4900),
    },
    status: { privacyStatus: "unlisted" },
  };

  const init = await fetch(
    `${UPLOAD_URL}?uploadType=resumable&part=snippet,status`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${input.accessToken}`,
        "Content-Type": "application/json; charset=UTF-8",
        "X-Upload-Content-Type": input.mime,
        "X-Upload-Content-Length": String(input.data.byteLength),
      },
      body: JSON.stringify(metadata),
    },
  );
  if (!init.ok) {
    throw new YoutubeError(
      `Khởi tạo upload YouTube thất bại (${init.status}).`,
      await init.text().catch(() => ""),
    );
  }
  const location = init.headers.get("location");
  if (!location) {
    throw new YoutubeError("YouTube không trả về địa chỉ upload.");
  }

  const upload = await fetch(location, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      "Content-Type": input.mime,
    },
    body: input.data,
  });
  if (!upload.ok) {
    throw new YoutubeError(
      `Upload video lên YouTube thất bại (${upload.status}).`,
      await upload.text().catch(() => ""),
    );
  }
  const result = await upload.json();
  const videoId = result?.id;
  if (!videoId) {
    throw new YoutubeError("Phản hồi upload thiếu video id.");
  }
  return videoId as string;
}

export function createOAuthState(): string {
  return randomBytes(16).toString("hex");
}
