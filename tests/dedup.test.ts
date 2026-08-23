import { describe, expect, it } from "vitest";
import {
  buildReusedResourceFileRow,
  buildReusedResourceRow,
  canDeduplicate,
  type ReusableObject,
} from "@/lib/upload/dedup";

const SOURCE: ReusableObject = {
  id: "src-1",
  storage_key: "user-1/res-1/uuid.pdf",
  provider: "r2",
  mime: "application/pdf",
  size_bytes: 1024,
};

describe("canDeduplicate", () => {
  it("allows dedup for stored file types with a hash", () => {
    expect(
      canDeduplicate({ resourceType: "pdf", sha256: "a".repeat(64) }),
    ).toBe(true);
    expect(
      canDeduplicate({ resourceType: "image", sha256: "b".repeat(64) }),
    ).toBe(true);
  });

  it("rejects when no hash is available yet", () => {
    expect(canDeduplicate({ resourceType: "pdf", sha256: null })).toBe(false);
  });

  it("never dedups videos (YouTube) or url resources", () => {
    expect(canDeduplicate({ resourceType: "video", sha256: "c".repeat(64) })).toBe(
      false,
    );
    expect(canDeduplicate({ resourceType: "url", sha256: "d".repeat(64) })).toBe(
      false,
    );
  });
});

describe("buildReusedResourceRow", () => {
  const row = buildReusedResourceRow({
    ownerId: "user-2",
    workspaceId: "ws-1",
    lessonId: "les-1",
    title: "Bài giảng",
    resourceType: "pdf",
    originalFilename: "bai-giang.pdf",
    contentHash: "e".repeat(64),
    source: SOURCE,
  });

  it("points at the existing object instead of a new upload", () => {
    expect(row.storage_key).toBe(SOURCE.storage_key);
    expect(row.provider).toBe(SOURCE.provider);
    expect(row.lifecycle_state).toBe("ready");
    expect(row.visibility).toBe("private");
  });

  it("keeps the new logical identity and metadata of the duplicate upload", () => {
    expect(row.owner_id).toBe("user-2");
    expect(row.title).toBe("Bài giảng");
    expect(row.original_filename).toBe("bai-giang.pdf");
    expect(row.mime).toBe(SOURCE.mime);
    expect(row.size_bytes).toBe(SOURCE.size_bytes);
    expect(row.content_hash).toBe("e".repeat(64));
  });
});

describe("buildReusedResourceFileRow", () => {
  it("records version 1 referencing the shared object", () => {
    const fileRow = buildReusedResourceFileRow({
      resourceId: "res-new",
      source: SOURCE,
      contentHash: "f".repeat(64),
    });
    expect(fileRow).toEqual({
      resource_id: "res-new",
      provider: "r2",
      storage_key: SOURCE.storage_key,
      mime: "application/pdf",
      size_bytes: 1024,
      sha256: "f".repeat(64),
      version: 1,
    });
  });

  it("supports an explicit version number", () => {
    const fileRow = buildReusedResourceFileRow({
      resourceId: "res-new",
      source: SOURCE,
      contentHash: "f".repeat(64),
      version: 3,
    });
    expect(fileRow.version).toBe(3);
  });
});
