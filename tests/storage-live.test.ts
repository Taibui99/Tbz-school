import { describe, expect, it } from "vitest";
import { getActiveStorageProvider, getStorageProvider } from "@/lib/storage";
import { createAdminClient } from "@/lib/supabase/admin";
import { StorageError } from "@/lib/storage/types";

const live = describe.skipIf(
  !process.env.SUPABASE_SERVICE_ROLE_KEY ||
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.TEST_USER_ID,
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

  it("upload flow thật: signed PUT → object tồn tại → finalize ready → dọn dẹp", async () => {
    const admin = createAdminClient();
    const ownerId = process.env.TEST_USER_ID!;

    const { data: resource, error: createError } = await admin
      .from("resources")
      .insert({
        owner_id: ownerId,
        workspace_id: "0e83d7b2-9c44-4bd3-90a8-65bea7fb4a94",
        lesson_id: "34588396-2cd4-4816-8e5f-c92727c523e8",
        title: "Smoke upload",
        type: "pdf",
        lifecycle_state: "draft",
      })
      .select("id")
      .single();
    expect(createError).toBeNull();
    expect(resource).not.toBeNull();

    const provider = getActiveStorageProvider();
    const key = `${ownerId}/${resource!.id}/${crypto.randomUUID()}.pdf`;
    const uploadUrl = await provider.getSignedUploadUrl(key);

    const body = new TextEncoder().encode("smoke pdf");
    const put = await fetch(uploadUrl, {
      method: "PUT",
      body,
      headers: { "Content-Type": "application/pdf" },
    });
    expect(put.ok).toBe(true);

    expect(await provider.objectExists(key)).toBe(true);
    const meta = await provider.getObjectMetadata(key);
    expect(meta.sizeBytes).toBe(body.byteLength);
    expect(meta.contentType).toBe("application/pdf");

    const { error: updateError } = await admin
      .from("resources")
      .update({
        lifecycle_state: "ready",
        provider: provider.name,
        storage_key: key,
        mime: "application/pdf",
        size_bytes: body.byteLength,
        original_filename: "smoke.pdf",
      })
      .eq("id", resource!.id);
    expect(updateError).toBeNull();

    const { error: fileError } = await admin.from("resource_files").insert({
      resource_id: resource!.id,
      provider: provider.name,
      storage_key: key,
      mime: "application/pdf",
      size_bytes: body.byteLength,
      version: 1,
    });
    expect(fileError).toBeNull();

    await admin.from("resources").delete().eq("id", resource!.id);
    await provider.deleteObject(key);
    expect(await provider.objectExists(key)).toBe(false);
  }, 30000);
});