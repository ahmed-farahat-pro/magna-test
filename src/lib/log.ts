// Minimal structured logger. Emits one JSON line per event to stdout/stderr,
// which Vercel captures in its function logs — so failures are debuggable and the
// per-request requestId that clients receive can actually be correlated server-side.

type Level = "error" | "warn" | "info";

function emit(
  level: Level,
  scope: string,
  requestId: string,
  msg: string,
  meta?: Record<string, unknown>,
) {
  const line = JSON.stringify({
    t: new Date().toISOString(),
    level,
    scope,
    requestId,
    msg,
    ...(meta ?? {}),
  });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export function logError(
  scope: string,
  requestId: string,
  err: unknown,
  meta?: Record<string, unknown>,
) {
  emit("error", scope, requestId, err instanceof Error ? err.message : String(err), {
    ...(meta ?? {}),
    stack:
      err instanceof Error && err.stack
        ? err.stack.split("\n").slice(0, 4).join(" | ")
        : undefined,
  });
}

export function logWarn(
  scope: string,
  requestId: string,
  msg: string,
  meta?: Record<string, unknown>,
) {
  emit("warn", scope, requestId, msg, meta);
}
