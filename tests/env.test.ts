import { describe, expect, it } from "vitest";
import {
  APP_ENV_VARS,
  getMissingEnvVars,
  validateEnv,
} from "@/lib/env";

describe("getMissingEnvVars", () => {
  it("liệt kê tất cả biến khi chưa có biến nào", () => {
    const missing = getMissingEnvVars({});
    expect(missing).toEqual([...APP_ENV_VARS]);
  });

  it("bỏ qua các biến đã được đặt", () => {
    const missing = getMissingEnvVars({ NEXT_PUBLIC_APP_URL: "http://x" });
    expect(missing).not.toContain("NEXT_PUBLIC_APP_URL");
  });

  it("không liệt kê biến có giá trị rỗng", () => {
    const missing = getMissingEnvVars({ R2_BUCKET_NAME: "" });
    expect(missing).toContain("R2_BUCKET_NAME");
  });
});

describe("validateEnv", () => {
  it("trả ok=false khi thiếu biến", () => {
    const result = validateEnv({});
    expect(result.ok).toBe(false);
    expect(result.missing.length).toBeGreaterThan(0);
  });

  it("trả ok=true khi đủ biến", () => {
    const fullEnv = Object.fromEntries(APP_ENV_VARS.map((name) => [name, "x"]));
    const result = validateEnv(fullEnv);
    expect(result.ok).toBe(true);
    expect(result.missing).toEqual([]);
  });

  it("ném lỗi ở chế độ strict khi thiếu biến", () => {
    expect(() => validateEnv({}, { strict: true })).toThrow(
      "Thiếu biến môi trường bắt buộc",
    );
  });
});