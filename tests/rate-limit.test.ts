import { describe, expect, it, beforeEach } from "vitest";
import { checkRateLimit, resetRateLimits } from "@/lib/security/rate-limit";

describe("checkRateLimit", () => {
  beforeEach(() => {
    resetRateLimits();
  });

  it("cho phép các request trong hạn mức", () => {
    const t0 = 1_000_000;
    for (let i = 0; i < 5; i++) {
      const result = checkRateLimit("u1:upload", 5, 60_000, t0);
      expect(result.ok).toBe(true);
    }
    expect(checkRateLimit("u1:upload", 5, 60_000, t0).ok).toBe(false);
  });

  it("chặn khi vượt hạn mức và trả thời gian chờ", () => {
    const t0 = 2_000_000;
    checkRateLimit("u2:report", 2, 30_000, t0);
    checkRateLimit("u2:report", 2, 30_000, t0);
    const blocked = checkRateLimit("u2:report", 2, 30_000, t0 + 10_000);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterSec).toBeGreaterThan(0);
    expect(blocked.retryAfterSec).toBeLessThanOrEqual(20);
  });

  it("mở lại sau khi hết cửa sổ", () => {
    const t0 = 3_000_000;
    checkRateLimit("u3:share", 1, 60_000, t0);
    expect(checkRateLimit("u3:share", 1, 60_000, t0 + 1000).ok).toBe(false);
    const after = checkRateLimit("u3:share", 1, 60_000, t0 + 61_000);
    expect(after.ok).toBe(true);
    expect(after.remaining).toBe(0);
  });

  it("tách khóa riêng cho từng user/hành động", () => {
    const t0 = 4_000_000;
    checkRateLimit("a:login", 1, 60_000, t0);
    checkRateLimit("b:login", 1, 60_000, t0);
    expect(checkRateLimit("a:login", 1, 60_000, t0).ok).toBe(false);
    expect(checkRateLimit("a:report", 1, 60_000, t0).ok).toBe(true);
  });
});
