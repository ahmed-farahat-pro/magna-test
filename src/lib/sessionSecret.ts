// Single source of truth for the session-signing secret, safe in both the Node
// and Edge runtimes (only touches process.env). Returns null in production when
// no real secret is set, so callers can FAIL CLOSED instead of silently signing
// cookies with a public default (which would make session cookies forgeable).

const DEV_ONLY_SECRET = "dev-insecure-secret-change-me";

export function resolveSessionSecret(): string | null {
  const s = process.env.SESSION_SECRET;
  if (s && s.length >= 16) return s;
  if (process.env.NODE_ENV !== "production") {
    // Local dev convenience — never used in production.
    return DEV_ONLY_SECRET;
  }
  return null;
}

/** True when a real secret is configured (used by the health probe). */
export function sessionSecretConfigured(): boolean {
  return resolveSessionSecret() !== null;
}
