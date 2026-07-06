// Simple in-memory, per-session fixed-window rate limiter. Sufficient for a
// single-instance assessment deployment; the swap-in for production is Upstash
// Redis behind this same signature. Documented as such in the README.
type Bucket = { count: number; resetAt: number };

const store = new Map<string, Bucket>();

const LIMITS = {
  generate: { max: 20, windowMs: 60_000 },
  image: { max: 12, windowMs: 60_000 },
} as const;

type BucketKey = keyof typeof LIMITS;

export function checkRateLimit(
  sessionId: string,
  bucket: BucketKey,
): { ok: true } | { ok: false; retryAfter: number } {
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
