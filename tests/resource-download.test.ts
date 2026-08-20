import { describe, expect, it } from "vitest";
import { evaluateDownload } from "@/lib/resource/download";

const file = {
  type: "pdf",
  lifecycleState: "ready",
  deletedAt: null,
  provider: "supabase_storage",
  storageKey: "uploads/a.pdf",
  externalUrl: null,
};

describe("evaluateDownload", () => {
  it("allows a ready file resource with storage", () => {
    expect(evaluateDownload(file)).toEqual({ allowed: true });
  });

  it("blocks external resources", () => {
    expect(
      evaluateDownload({ ...file, type: "url", externalUrl: "https://x.com" }),
    ).toEqual({ allowed: false, reason: "external" });
  });

  it("blocks url-type even without external row", () => {
    expect(evaluateDownload({ ...file, type: "url", externalUrl: null })).toEqual(
      { allowed: false, reason: "external" },
    );
  });

  it("blocks draft/uploading/processing/failed resources", () => {
    for (const state of ["draft", "uploading", "processing", "failed"]) {
      expect(evaluateDownload({ ...file, lifecycleState: state })).toEqual({
        allowed: false,
        reason: "not-ready",
      });
    }
  });

  it("blocks resources without storage", () => {
    expect(
      evaluateDownload({ ...file, provider: null, storageKey: null }),
    ).toEqual({ allowed: false, reason: "no-file" });
  });

  it("blocks youtube-backed videos", () => {
    expect(
      evaluateDownload({ ...file, type: "video", youtubeId: "abc123xyz09" }),
    ).toEqual({ allowed: false, reason: "external" });
  });

  it("allows file resources when youtubeId is absent", () => {
    expect(evaluateDownload({ ...file, youtubeId: undefined })).toEqual({
      allowed: true,
    });
  });

  it("blocks deleted resources", () => {
    expect(
      evaluateDownload({ ...file, deletedAt: "2026-08-15T00:00:00Z" }),
    ).toEqual({ allowed: false, reason: "deleted" });
  });
});