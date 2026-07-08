import { randomUUID } from "crypto";

export type ErrorCode =
  | "VALIDATION_ERROR"
  | "RATE_LIMITED"
  | "UPSTREAM_LLM_ERROR"
  | "UPSTREAM_IMAGE_ERROR"
  | "UPSTREAM_BLOB_ERROR"
  | "CONFIG_ERROR"
  | "UNAUTHORIZED"
  | "CONTENT_BLOCKED"
  | "NOT_FOUND"
  | "METHOD_NOT_ALLOWED"
  | "PAYLOAD_TOO_LARGE"
  | "INTERNAL_ERROR";

const DEFAULT_STATUS: Record<ErrorCode, number> = {
  VALIDATION_ERROR: 400,
  RATE_LIMITED: 429,
  UPSTREAM_LLM_ERROR: 502,
  UPSTREAM_IMAGE_ERROR: 502,
  UPSTREAM_BLOB_ERROR: 502,
  CONFIG_ERROR: 503,
  UNAUTHORIZED: 401,
  CONTENT_BLOCKED: 422,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  PAYLOAD_TOO_LARGE: 413,
  INTERNAL_ERROR: 500,
};

export function newRequestId(): string {
  return "req_" + randomUUID().replace(/-/g, "").slice(0, 20);
}

/** Cheap first-line guard: reject oversized request bodies by Content-Length. */
export function tooLarge(req: Request, maxBytes = 256_000): boolean {
  const len = Number(req.headers.get("content-length") || 0);
  return Number.isFinite(len) && len > maxBytes;
}

/** Best-effort client IP (Vercel sets x-forwarded-for) for IP-keyed rate limits. */
export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  return (fwd ? fwd.split(",")[0].trim() : "") || "unknown";
}

export function ok<T>(
  data: T,
  requestId: string,
  init?: { status?: number },
): Response {
  return Response.json(data, {
    status: init?.status ?? 200,
    headers: { "x-request-id": requestId },
  });
}

export function fail(
  code: ErrorCode,
  message: string,
  requestId: string,
  opts?: {
    status?: number;
    details?: { path: string; message: string }[];
    headers?: Record<string, string>;
  },
): Response {
  const status = opts?.status ?? DEFAULT_STATUS[code];
  return Response.json(
    {
      error: {
        code,
        message,
        requestId,
        ...(opts?.details ? { details: opts.details } : {}),
      },
    },
    { status, headers: { "x-request-id": requestId, ...(opts?.headers ?? {}) } },
  );
}
