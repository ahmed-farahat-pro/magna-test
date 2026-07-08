import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Per-session, per-bucket rate limiting.
//
// Durable backend: Upstash Redis (sliding window) when UPSTASH_REDIS_REST_URL +
// UPSTASH_REDIS_REST_TOKEN are set — correct across Vercel's many serverless
// instances and cold starts. Falls back to a per-instance in-memory window when
// Upstash isn't configured, so the app still works locally / without Redis.

const LIMITS = {
  generate: { max: 20, window: "60 s" as const, windowMs: 60_000 },
  image: { max: 12, window: "60 s" as const, windowMs: 60_000 },
  // Auth is keyed by client IP (not session) so it can't be bypassed by dropping
  // the cookie — throttles password brute-force / credential-stuffing.
  auth: { max: 10, window: "60 s" as const, windowMs: 60_000 },
} as const;

type BucketKey = keyof typeof LIMITS;
type Result = { ok: true } | { ok: false; retryAfter: number };

// ── Upstash (durable) ────────────────────────────────────────────────────────
let limiters: Record<BucketKey, Ratelimit> | null | undefined;

function getLimiters(): Record<BucketKey, Ratelimit> | null {
  if (limiters !== undefined) return limiters;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    limiters = null;
    return null;
  }
  try {
    const redis = new Redis({ url, token });
    limiters = {
      generate: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(LIMITS.generate.max, LIMITS.generate.window),
        prefix: "rl:generate",
      }),
      image: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(LIMITS.image.max, LIMITS.image.window),
        prefix: "rl:image",
      }),
      auth: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(LIMITS.auth.max, LIMITS.auth.window),
        prefix: "rl:auth",
      }),
    };
  } catch {
    limiters = null;
  }
  return limiters;
}

/** Which backend is active — surfaced by the health probe. */
export function rateLimitBackend(): "upstash" | "memory" {
  return getLimiters() ? "upstash" : "memory";
}

// ── In-memory fallback (single instance) ─────────────────────────────────────
type Bucket = { count: number; resetAt: number };
const store = new Map<string, Bucket>();

function memoryCheck(sessionId: string, bucket: BucketKey): Result {
  const cfg = LIMITS[bucket];
  const key = `${bucket}:${sessionId}`;
  const now = Date.now();
  const b = store.get(key);
  if (!b || now >= b.resetAt) {
    store.set(key, { count: 1, resetAt: now + cfg.windowMs });
    return { ok: true };
  }
  if (b.count >= cfg.max) {
    return { ok: false, retryAfter: Math.ceil((b.resetAt - now) / 1000) };
  }
  b.count += 1;
  return { ok: true };
}

export async function checkRateLimit(
  sessionId: string,
  bucket: BucketKey,
): Promise<Result> {
  const ls = getLimiters();
  if (ls) {
    try {
      const r = await ls[bucket].limit(sessionId);
      if (r.success) return { ok: true };
      return {
        ok: false,
        retryAfter: Math.max(1, Math.ceil((r.reset - Date.now()) / 1000)),
      };
    } catch {
      // Redis hiccup — degrade to the in-memory window rather than fail the request.
    }
  }
  return memoryCheck(sessionId, bucket);
}
