import { getActor } from "@/lib/session";
import { track } from "@/lib/track";
import { checkRateLimit } from "@/lib/rateLimit";
import { ok, fail, newRequestId, tooLarge } from "@/lib/http";
import { enforceSchema, zodDetails, findAvoidedWords } from "@/lib/validation";
import { aiEnabled } from "@/lib/ai/config";
import { enforceVoice } from "@/lib/ai/enforceVoice";
import { describeAiError } from "@/lib/ai/errors";
import { dbEnabled, getPrisma } from "@/lib/db";
import { logError } from "@/lib/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Rewrite copy to hard-remove the brand's "avoid" words. Session-scoped; updates
// the stored generation in place when a generationId is supplied.
export async function POST(req: Request) {
  const requestId = newRequestId();
  try {
    const { id: sessionId, isUser } = await getActor();

    const rl = await checkRateLimit(sessionId, "generate");
    if (!rl.ok) {
      return fail("RATE_LIMITED", `Too many requests. Try again in ${rl.retryAfter}s.`, requestId, {
        headers: { "retry-after": String(rl.retryAfter) },
      });
    }
    if (tooLarge(req)) {
      return fail("PAYLOAD_TOO_LARGE", "Request body is too large.", requestId);
    }

    const body = await req.json().catch(() => null);
    const parsed = enforceSchema.safeParse(body);
    if (!parsed.success) {
      const details = zodDetails(parsed.error);
      return fail("VALIDATION_ERROR", details[0]?.message ?? "Invalid input.", requestId, { details });
    }
    if (!aiEnabled()) {
      return fail("CONFIG_ERROR", "AI is not configured (missing ANTHROPIC_API_KEY).", requestId);
    }

    const { generationId, text, avoid } = parsed.data;

    let rewritten: string;
    try {
      rewritten = await enforceVoice(text, avoid);
    } catch (e) {
      const ai = describeAiError(e, "text");
      logError("enforceVoice", requestId, e, { reason: ai.reason });
      return fail(ai.code, ai.message, requestId, {
        headers: ai.retryable ? { "retry-after": "5" } : undefined,
      });
    }

    // Did any avoid word survive? (surface honestly rather than claim a guarantee)
    const remaining = findAvoidedWords(rewritten, avoid);

    // Persist the cleaned copy over the original generation (ownership-scoped).
    if (generationId && dbEnabled()) {
      try {
        await getPrisma().generation.updateMany({
          where: { id: generationId, sessionId },
          data: { outputText: rewritten },
        });
      } catch (e) {
        logError("enforceVoice.persist", requestId, e);
      }
    }

    await track("enforce_voice", sessionId, isUser, { remaining: remaining.length });

    return ok({ text: rewritten, remaining }, requestId);
  } catch (e) {
    logError("enforceVoice", requestId, e);
    return fail("INTERNAL_ERROR", "Something went wrong.", requestId);
  }
}
