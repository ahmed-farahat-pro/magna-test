import { Redis } from "@upstash/redis";

// Per-session concurrency lock: at most ONE in-flight AI request per session at
// a time. This complements the sliding-window rate limiter — the rate limiter
// caps requests over a window, this stops a burst of *simultaneous* requests
// from one source (the "hammer the button / script the endpoint" abuse case),
// each of which is a real, billable Claude/OpenAI call.
//
// Durable across serverless instances via Upstash Redis (SET NX PX). Falls back
// to a per-instance in-memory guard when Upstash isn't configured — still stops
// the common double-submit locally, just not across cold starts.
//
// The lock carries a TTL so a request that dies mid-flight (crash, timeout,
// client disconnect) can't wedge the session shut forever — it auto-releases.

const TTL_MS = 90_000; // safety auto-release; every route also releases in finally

let redis: Redis | null | undefined;
function getRedis(): Redis | null {
  if (redis !== undefined) return redis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    redis = null;
    return null;
  }
  try {
    redis = new Redis({ url, token });
  } catch {
    redis = null;
  }
  return redis;
}

const key = (sessionId: string) => `lock:ai:${sessionId}`;

// ── In-memory fallback (single instance) ─────────────────────────────────────
const mem = new Map<string, number>(); // key → expiresAt (ms)

function memAcquire(k: string): boolean {
  const now = Date.now();
  const exp = mem.get(k);
  if (exp && exp > now) return false;
  mem.set(k, now + TTL_MS);
  return true;
}
function memRelease(k: string): void {
  mem.delete(k);
}

/**
 * Try to take this session's single AI slot. Returns `true` if acquired (the
 * caller may proceed and MUST call {@link releaseAiSlot} in a finally), or
 * `false` if another request from the same session is already running — the
 * caller should reject with a 429 rather than run a second concurrent AI call.
 */
export async function acquireAiSlot(sessionId: string): Promise<boolean> {
  const k = key(sessionId);
  const r = getRedis();
  if (r) {
    try {
      const res = await r.set(k, "1", { px: TTL_MS, nx: true });
      return res === "OK";
    } catch {
      // Redis hiccup — degrade to the in-memory guard rather than fail the request.
    }
  }
  return memAcquire(k);
}

/** Release this session's AI slot. Safe to call even if acquire used the fallback. */
export async function releaseAiSlot(sessionId: string): Promise<void> {
  const k = key(sessionId);
  const r = getRedis();
  if (r) {
    try {
      await r.del(k);
      return;
    } catch {
      // fall through to also clear any in-memory entry
    }
  }
  memRelease(k);
}
