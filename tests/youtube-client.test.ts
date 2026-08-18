import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildConsentUrl,
  getAccessToken,
  isGoogleConfigured,
  uploadVideoToYouTube,
  YOUTUBE_SCOPE,
} from "@/lib/youtube/client";

describe("isGoogleConfigured", () => {
  const original = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...original };
  });

  afterEach(() => {
    process.env = original;
  });

  it("false khi thiếu client id", () => {
    delete process.env.GOOGLE_CLIENT_ID;
    process.env.GOOGLE_CLIENT_SECRET = "secret";
    expect(isGoogleConfigured()).toBe(false);
  });

  it("false khi thiếu client secret", () => {
    process.env.GOOGLE_CLIENT_ID = "id";
    delete process.env.GOOGLE_CLIENT_SECRET;
    expect(isGoogleConfigured()).toBe(false);
  });

  it("true khi đủ cả hai", () => {
    process.env.GOOGLE_CLIENT_ID = "id";
    process.env.GOOGLE_CLIENT_SECRET = "secret";
    expect(isGoogleConfigured()).toBe(true);
  });
});

describe("buildConsentUrl", () => {
  it("gồm đúng client id, redirect uri, offline access và scope", () => {
    process.env.GOOGLE_CLIENT_ID = "client-id-123";
    const url = new URL(
      buildConsentUrl("http://localhost:3000/api/auth/google/callback", "st8"),
    );
    expect(url.origin + url.pathname).toBe(
      "https://accounts.google.com/o/oauth2/v2/auth",
    );
    expect(url.searchParams.get("client_id")).toBe("client-id-123");
    expect(url.searchParams.get("redirect_uri")).toBe(
      "http://localhost:3000/api/auth/google/callback",
    );
    expect(url.searchParams.get("response_type")).toBe("code");
    expect(url.searchParams.get("scope")).toBe(YOUTUBE_SCOPE);
    expect(url.searchParams.get("access_type")).toBe("offline");
    expect(url.searchParams.get("prompt")).toBe("consent");
    expect(url.searchParams.get("state")).toBe("st8");
  });
});

describe("getAccessToken", () => {
  it("làm mới access token từ refresh token", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ access_token: "fresh-token" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const token = await getAccessToken("rt-1");
    expect(token).toBe("fresh-token");

    const body = fetchMock.mock.calls[0][1]?.body as URLSearchParams;
    expect(body.get("grant_type")).toBe("refresh_token");
    expect(body.get("refresh_token")).toBe("rt-1");
    vi.unstubAllGlobals();
  });

  it("throw khi không có access token", async () => {
    vi.stubGlobal("fetch", () =>
      Promise.resolve({ ok: true, json: async () => ({}) }),
    );
    await expect(getAccessToken("rt-1")).rejects.toThrow(
      "Không nhận được access token",
    );
    vi.unstubAllGlobals();
  });

  it("throw khi server báo lỗi", async () => {
    vi.stubGlobal("fetch", () =>
      Promise.resolve({ ok: false, status: 400, text: async () => "bad" }),
    );
    await expect(getAccessToken("rt-1")).rejects.toThrow(
      /Làm mới access token thất bại/,
    );
    vi.unstubAllGlobals();
  });
});

describe("uploadVideoToYouTube", () => {
  it("upload resumable và trả về video id", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        headers: { get: () => "https://upload.example/session" },
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: "abc123xyz09" }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const data = new Uint8Array([1, 2, 3, 4]).buffer as ArrayBuffer;
    const videoId = await uploadVideoToYouTube({
      accessToken: "tok",
      title: "Bài giảng",
      description: "Nội dung",
      mime: "video/mp4",
      data,
    });
    expect(videoId).toBe("abc123xyz09");

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const initCall = fetchMock.mock.calls[0];
    const uploadCall = fetchMock.mock.calls[1];

    expect(initCall[0]).toContain("uploadType=resumable");
    expect(uploadCall[0]).toBe("https://upload.example/session");
    const initHeaders = initCall[1]?.headers as Record<string, string>;
    expect(initHeaders["Authorization"]).toBe("Bearer tok");
    expect(initHeaders["X-Upload-Content-Length"]).toBe("4");
    vi.unstubAllGlobals();
  });

  it("throw khi init upload thất bại", async () => {
    vi.stubGlobal("fetch", () =>
      Promise.resolve({ ok: false, status: 403, text: async () => "denied" }),
    );
    await expect(
      uploadVideoToYouTube({
        accessToken: "tok",
        title: "T",
        description: "",
        mime: "video/mp4",
        data: new Uint8Array([1]).buffer as ArrayBuffer,
      }),
    ).rejects.toThrow(/Khởi tạo upload YouTube thất bại/);
    vi.unstubAllGlobals();
  });

  it("throw khi upload body thất bại", async () => {
    vi.stubGlobal("fetch", () =>
      Promise.resolve({
        ok: true,
        headers: { get: () => "https://upload.example/session" },
      }).then((r) => r),
    );
    const initMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        headers: { get: () => "https://upload.example/session" },
      })
      .mockResolvedValueOnce({ ok: false, status: 500, text: async () => "x" });
    vi.stubGlobal("fetch", initMock);
    await expect(
      uploadVideoToYouTube({
        accessToken: "tok",
        title: "T",
        description: "",
        mime: "video/mp4",
        data: new Uint8Array([1]).buffer as ArrayBuffer,
      }),
    ).rejects.toThrow(/Upload video lên YouTube thất bại/);
    vi.unstubAllGlobals();
  });

  it("throw khi thiếu video id trong phản hồi", async () => {
    vi.stubGlobal("fetch", () =>
      Promise.resolve({
        ok: true,
        headers: { get: () => "https://upload.example/session" },
      }),
    );
    const mock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        headers: { get: () => "https://upload.example/session" },
      })
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) });
    vi.stubGlobal("fetch", mock);
    await expect(
      uploadVideoToYouTube({
        accessToken: "tok",
        title: "T",
        description: "",
        mime: "video/mp4",
        data: new Uint8Array([1]).buffer as ArrayBuffer,
      }),
    ).rejects.toThrow(/thiếu video id/);
    vi.unstubAllGlobals();
  });
});