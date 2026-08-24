interface BucketEntry {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, BucketEntry>();

const MAX_BUCKETS = 10_000;

function pruneExpired(now: number): void {
  if (buckets.size < MAX_BUCKETS) return;
  for (const [key, entry] of buckets) {
    if (entry.resetAt <= now) buckets.delete(key);
  }
}

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  retryAfterSec: number;
}

/**
 * Giới hạn tần suất dạng cửa sổ cố định (fixed-window), lưu trong bộ nhớ
 * tiến trình. Trên serverless mỗi instance có map riêng nên đây là lớp
 * giảm thiểu lạm dụng cơ bản, không phải giới hạn tuyệt đối toàn cục.
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
  now: number = Date.now(),
): RateLimitResult {
  pruneExpired(now);

  const entry = buckets.get(key);
  if (!entry || entry.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, retryAfterSec: 0 };
  }

  if (entry.count >= limit) {
    return {
      ok: false,
      remaining: 0,
      retryAfterSec: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)),
    };
  }

  entry.count += 1;
  return { ok: true, remaining: limit - entry.count, retryAfterSec: 0 };
}

/** Chỉ dùng trong test. */
export function resetRateLimits(): void {
  buckets.clear();
}
