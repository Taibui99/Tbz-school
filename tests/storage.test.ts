import { describe, expect, it } from "vitest";
import { mapR2Error } from "@/lib/storage/r2-error";
import { mapSupabaseStorageError } from "@/lib/storage/supabase-error";
import { StorageError } from "@/lib/storage/types";
import { createExternalStorageProvider } from "@/lib/storage";
import { isR2ConfigComplete } from "@/lib/storage/r2";

describe("mapR2Error", () => {
  it("ánh xạ NoSuchKey thành not-found", () => {
    const error = mapR2Error({ name: "NoSuchKey", message: "key not found" });
    expect(error).toBeInstanceOf(StorageError);
    expect(error.code).toBe("not-found");
  });

  it("ánh xạ HTTP 404 thành not-found", () => {
    const error = mapR2Error({ $metadata: { httpStatusCode: 404 } });
    expect(error.code).toBe("not-found");
  });

  it("ánh xạ AccessDenied thành forbidden", () => {
    const error = mapR2Error({ name: "AccessDenied" });
    expect(error.code).toBe("forbidden");
  });

  it("ánh xạ HTTP 403 thành forbidden", () => {
    const error = mapR2Error({ $metadata: { httpStatusCode: 403 } });
    expect(error.code).toBe("forbidden");
  });

  it("ánh xạ HTTP 400 thành invalid-key", () => {
    const error = mapR2Error({ $metadata: { httpStatusCode: 400 } });
    expect(error.code).toBe("invalid-key");
  });

  it("ánh xạ lỗi lạ thành provider-error", () => {
    const error = mapR2Error({ message: "network down" });
    expect(error.code).toBe("provider-error");
  });

  it("trả nguyên StorageError khi đã là StorageError", () => {
    const original = new StorageError("not-found", "x");
    expect(mapR2Error(original)).toBe(original);
  });
});

describe("mapSupabaseStorageError", () => {
  it("ánh xạ statusCode 404 thành not-found", () => {
    const error = mapSupabaseStorageError({ statusCode: 404 });
    expect(error).toBeInstanceOf(StorageError);
    expect(error.code).toBe("not-found");
  });

  it("ánh xạ statusCode dạng chuỗi '404' thành not-found", () => {
    const error = mapSupabaseStorageError({ statusCode: "404" });
    expect(error.code).toBe("not-found");
  });

  it("ánh xạ code NoSuchKey thành not-found", () => {
    const error = mapSupabaseStorageError({
      code: "NoSuchKey",
      status: 400,
      message: "Object not found",
    });
    expect(error.code).toBe("not-found");
  });

  it("ánh xạ statusCode 403 thành forbidden", () => {
    const error = mapSupabaseStorageError({ statusCode: 403 });
    expect(error.code).toBe("forbidden");
  });

  it("ánh xạ statusCode 400 thành invalid-key", () => {
    const error = mapSupabaseStorageError({ statusCode: 400 });
    expect(error.code).toBe("invalid-key");
  });

  it("ánh xạ statusCode 409 thành already-exists", () => {
    const error = mapSupabaseStorageError({ statusCode: 409 });
    expect(error.code).toBe("already-exists");
  });

  it("ánh xạ statusCode 413 thành quota-exceeded", () => {
    const error = mapSupabaseStorageError({ statusCode: 413 });
    expect(error.code).toBe("quota-exceeded");
  });

  it("ánh xạ lỗi không có statusCode thành provider-error", () => {
    const error = mapSupabaseStorageError({ message: "boom" });
    expect(error.code).toBe("provider-error");
  });

  it("giữ message khi có", () => {
    const error = mapSupabaseStorageError({
      statusCode: 404,
      message: "The resource was not found",
    });
    expect(error.message).toContain("The resource was not found");
  });
});

describe("isR2ConfigComplete", () => {
  it("trả false khi thiếu bất kỳ biến R2 nào", () => {
    expect(isR2ConfigComplete({})).toBe(false);
    expect(
      isR2ConfigComplete({
        R2_ACCOUNT_ID: "a",
        R2_ACCESS_KEY_ID: "b",
        R2_SECRET_ACCESS_KEY: "c",
      }),
    ).toBe(false);
  });

  it("trả true khi đủ 4 biến R2", () => {
    expect(
      isR2ConfigComplete({
        R2_ACCOUNT_ID: "a",
        R2_ACCESS_KEY_ID: "b",
        R2_SECRET_ACCESS_KEY: "c",
        R2_BUCKET_NAME: "d",
      }),
    ).toBe(true);
  });
});

describe("ExternalStorageProvider", () => {
  it("trả URL đúng khi getSignedReadUrl", async () => {
    const provider = createExternalStorageProvider("https://example.com/x.pdf");
    await expect(provider.getSignedReadUrl("ignored")).resolves.toBe(
      "https://example.com/x.pdf",
    );
  });

  it("không xóa object", async () => {
    const provider = createExternalStorageProvider("https://example.com/x.pdf");
    await expect(provider.deleteObject("ignored")).resolves.toBeUndefined();
  });

  it("coi object luôn tồn tại", async () => {
    const provider = createExternalStorageProvider("https://example.com/x.pdf");
    await expect(provider.objectExists("ignored")).resolves.toBe(true);
  });

  it("metadata rỗng (size 0)", async () => {
    const provider = createExternalStorageProvider("https://example.com/x.pdf");
    await expect(provider.getObjectMetadata("ignored")).resolves.toEqual({
      sizeBytes: 0,
      contentType: null,
    });
  });

  it("từ chối upload object", async () => {
    const provider = createExternalStorageProvider("https://example.com/x.pdf");
    await expect(provider.uploadObject({ key: "k", body: new Uint8Array() }))
      .rejects.toMatchObject({ code: "provider-error" });
  });
});