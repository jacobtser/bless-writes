/**
 * Best-effort, in-memory fixed-window rate limiter.
 *
 * IMPORTANT LIMITATION: state lives in a module-level Map, so it is per-process.
 * On serverless platforms it only throttles requests landing on the same warm
 * instance — it is a cheap abuse brake, not a distributed limiter. For strict
 * limits, back this with a shared store (Upstash/Redis, Vercel KV, etc.).
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();
const SWEEP_THRESHOLD = 1_000;

/** Best-effort client IP from the usual proxy headers. */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

/** Fixed-window limiter. First call in a window starts the counter at 1. */
export function rateLimit(
  key: string,
  { limit, windowMs }: { limit: number; windowMs: number },
): { ok: boolean; retryAfter: number } {
  const now = Date.now();
  if (buckets.size > SWEEP_THRESHOLD) {
    for (const [bucketKey, bucket] of buckets) {
      if (now >= bucket.resetAt) buckets.delete(bucketKey);
    }
  }

  const bucket = buckets.get(key);
  if (!bucket || now >= bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfter: 0 };
  }
  if (bucket.count >= limit) {
    return { ok: false, retryAfter: Math.ceil((bucket.resetAt - now) / 1000) };
  }
  bucket.count += 1;
  return { ok: true, retryAfter: 0 };
}

/**
 * Convenience guard for route handlers: returns a 429 response when the caller
 * has exceeded the limit, or `null` when the request may proceed.
 */
export function enforceRateLimit(
  request: Request,
  name: string,
  options: { limit: number; windowMs: number },
) {
  const ip = getClientIp(request);
  const result = rateLimit(`${name}:${ip}`, options);
  if (result.ok) return null;

  // Plain `Response` is a valid route-handler return and keeps this module free
  // of the `next/server` import (so it stays trivially unit-testable).
  return Response.json(
    { error: "Too many requests. Please slow down and try again shortly." },
    { status: 429, headers: { "Retry-After": String(result.retryAfter) } },
  );
}
