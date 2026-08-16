import { describe, expect, it } from "vitest";
import { getStorageProvider } from "@/lib/storage";
import { StorageError } from "@/lib/storage/types";

const live = describe.skipIf(
  !process.env.SUPABASE_SERVICE_ROLE_KEY ||
    !process.env.NEXT_PUBLIC_SUPABASE_URL,
);

live("Storage live smoke (chạy riêng khi có SUPABASE_SERVICE_ROLE_KEY)", () => {
  it("supabase_storage: upload → signed URL → read → metadata → exists → delete", async () => {
    const provider = getStorageProvider("supabase_storage");
    const key = `test/${crypto.randomUUID()}.txt`;
    const content = new TextEncoder().encode("hello storage");

    const uploaded = await provider.uploadObject({
      key,
      body: content,
      contentType: "text/plain",
    });
    expect(uploaded.key).toBe(key);
    expect(uploaded.sizeBytes).toBe(content.byteLength);

    const url = await provider.getSignedReadUrl(key, { expiresInSeconds: 60 });
    expect(url).toContain("files");

    const res = await fetch(url);
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toBe("hello storage");

    const meta = await provider.getObjectMetadata(key);
    expect(meta.sizeBytes).toBe(content.byteLength);
    expect(meta.contentType).toBe("text/plain");

    expect(await provider.objectExists(key)).toBe(true);

    await provider.deleteObject(key);
    expect(await provider.objectExists(key)).toBe(false);
  }, 30000);

  it("signed read URL của key không tồn tại trả not-found khi đọc metadata", async () => {
    const provider = getStorageProvider("supabase_storage");
    const key = `test/${crypto.randomUUID()}.missing.txt`;
    await expect(provider.getObjectMetadata(key)).rejects.toMatchObject({
      code: "not-found",
    });
    expect(await provider.objectExists(key)).toBe(false);
  }, 30000);

  it("r2 chưa cấu hình env → throw provider-error", () => {
    const r2 = Object.fromEntries(
      ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET_NAME"].map(
        (name) => [name, ""],
      ),
    );
    const original = { ...process.env };
    Object.assign(process.env, r2);
    try {
      expect(() => getStorageProvider("r2")).toThrow(StorageError);
    } finally {
      Object.assign(process.env, original);
    }
  });
});