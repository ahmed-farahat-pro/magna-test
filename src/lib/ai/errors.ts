import type { ErrorCode } from "@/lib/http";

/**
 * Turn any error thrown by the AI layer — an Anthropic/OpenAI SDK error, a
 * network failure, or one of our own internal codes ("refusal", "parse_failed",
 * "degenerate_output", "empty image response") — into a declarative, actionable
 * failure the user can understand:
 *   - `code`     → an existing envelope ErrorCode (drives the HTTP status)
 *   - `reason`   → a stable machine sub-reason for logs/telemetry
 *   - `message`  → plain-language text telling the user WHAT went wrong & whether
 *                  it's worth retrying or needs a config/billing fix
 *   - `retryable`→ whether a retry could plausibly succeed
 */
export type AiFailure = {
  code: ErrorCode;
  reason: string;
  message: string;
  retryable: boolean;
};

type LooseError = {
  status?: number;
  name?: string;
  message?: string;
  code?: string;
  type?: string;
  error?: { type?: string; message?: string; code?: string };
};

export function describeAiError(
  e: unknown,
  ctx: "text" | "image" = "text",
): AiFailure {
  const err = (e ?? {}) as LooseError;
  const status = typeof err.status === "number" ? err.status : undefined;
  const type = String(
    err.error?.type || err.type || err.code || err.error?.code || "",
  ).toLowerCase();
  const raw = String(
    err.error?.message || err.message || (typeof e === "string" ? e : "") || "",
  ).toLowerCase();
  const name = String(err.name || "");

  const subject = ctx === "image" ? "The image generator" : "The AI writer";
  const upstream: ErrorCode =
    ctx === "image" ? "UPSTREAM_IMAGE_ERROR" : "UPSTREAM_LLM_ERROR";
  const R = (
    code: ErrorCode,
    reason: string,
    message: string,
    retryable: boolean,
  ): AiFailure => ({ code, reason, message, retryable });

  // ── Our own internal signals ────────────────────────────────────────────────
  if (raw === "refusal")
    return R(
      upstream,
      "refusal",
      ctx === "image"
        ? "The image request was declined by the model's safety policy. Try a different topic or a different style."
        : "The AI declined to write this under its content policy. Try rephrasing the topic, tone, or audience.",
      false,
    );
  if (
    raw === "parse_failed" ||
    raw === "degenerate_output" ||
    raw === "empty image response" ||
    raw === "generation_failed"
  )
    return R(
      upstream,
      raw,
      `${subject} returned an unusable result. This is usually transient — please try again.`,
      true,
    );

  // ── Authentication (missing/invalid key) ───────────────────────────────────
  if (
    status === 401 ||
    type.includes("authentication") ||
    /invalid api key|incorrect api key|invalid x-api-key|no api key|unauthorized|missing bearer/.test(
      raw,
    )
  )
    return R(
      "CONFIG_ERROR",
      "auth",
      `${subject} rejected the server's API key — it's missing or invalid. This needs a configuration fix, not a retry.`,
      false,
    );

  // ── Quota / billing ─────────────────────────────────────────────────────────
  if (
    status === 402 ||
    type.includes("insufficient_quota") ||
    /insufficient_quota|exceeded your current quota|billing hard limit|not enough credit|insufficient balance/.test(
      raw,
    )
  )
    return R(
      "CONFIG_ERROR",
      "quota",
      `${subject} is out of credits/quota on the server account. Top up billing to continue — retrying won't help until then.`,
      false,
    );

  // ── Permission / model verification / region ───────────────────────────────
  if (
    status === 403 ||
    type.includes("permission") ||
    /must be verified|do not have access|not have access|unsupported_country|region|permission/.test(
      raw,
    )
  )
    return R(
      "CONFIG_ERROR",
      "forbidden",
      `${subject} denied access — the account isn't verified for this model, feature, or region.`,
      false,
    );

  // ── Rate limit ──────────────────────────────────────────────────────────────
  if (
    status === 429 ||
    type.includes("rate_limit") ||
    /rate limit|too many requests/.test(raw)
  )
    return R(
      "RATE_LIMITED",
      "rate_limit",
      `${subject} is being rate-limited right now. Wait a few seconds and try again.`,
      true,
    );

  // ── Temporarily overloaded ──────────────────────────────────────────────────
  if (status === 529 || type.includes("overloaded") || /overloaded/.test(raw))
    return R(
      upstream,
      "overloaded",
      `${subject} is temporarily overloaded. Please retry in a moment.`,
      true,
    );

  // ── Content / safety policy ─────────────────────────────────────────────────
  if (
    type.includes("content_policy") ||
    type.includes("invalid_prompt") ||
    /content policy|content_policy|safety system|moderation|flagged|violat|safety filter/.test(
      raw,
    )
  )
    return R(
      upstream,
      "content_policy",
      ctx === "image"
        ? "The image prompt was blocked by the safety filter. Try a different topic or style."
        : "The request was blocked by the content-safety filter. Try rephrasing the topic or tone.",
      false,
    );

  // ── Timeout / connection ────────────────────────────────────────────────────
  if (
    name === "APIConnectionTimeoutError" ||
    name === "APIConnectionError" ||
    /timeout|timed out|aborted|abort|econnreset|econnrefused|network|fetch failed|socket hang up/.test(
      raw,
    )
  )
    return R(
      upstream,
      "timeout",
      `${subject} took too long to respond and timed out. Please try again.`,
      true,
    );

  // ── Bad request (too long / invalid params) ────────────────────────────────
  if (
    status === 400 ||
    type.includes("invalid_request") ||
    /invalid_request|too long|maximum context|context length|max_tokens|prompt is too long|string too long/.test(
      raw,
    )
  )
    return R(
      upstream,
      "bad_request",
      ctx === "image"
        ? "The image request was invalid — the prompt may be too long or the size unsupported."
        : "The request was rejected as invalid — the topic or text may be too long for the model.",
      false,
    );

  // ── Upstream 5xx ────────────────────────────────────────────────────────────
  if (status !== undefined && status >= 500)
    return R(
      upstream,
      "upstream_5xx",
      `${subject} had an internal error (${status}). Please try again shortly.`,
      true,
    );

  // ── Fallback ────────────────────────────────────────────────────────────────
  return R(
    upstream,
    "unknown",
    `${subject} couldn't complete the request${status ? ` (error ${status})` : ""}. Please try again.`,
    true,
  );
}
