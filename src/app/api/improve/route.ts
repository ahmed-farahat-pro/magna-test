import { getActor } from "@/lib/session";
import { track } from "@/lib/track";
import { checkRateLimit } from "@/lib/rateLimit";
import { ok, fail, newRequestId, tooLarge } from "@/lib/http";
import { improveSchema, zodDetails, IMPROVE_GOAL_DB } from "@/lib/validation";
import { aiEnabled, MODEL } from "@/lib/ai/config";
import { improve } from "@/lib/ai/improve";
import { describeAiError } from "@/lib/ai/errors";
import { logError } from "@/lib/log";
import { dbEnabled, getPrisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
    const parsed = improveSchema.safeParse(body);
    if (!parsed.success) {
      const details = zodDetails(parsed.error);
      return fail("VALIDATION_ERROR", details[0]?.message ?? "Invalid input.", requestId, { details });
    }

    if (!aiEnabled()) {
      return fail("CONFIG_ERROR", "AI is not configured on the server yet (missing ANTHROPIC_API_KEY).", requestId);
    }

    const { text, goal, targetAudience } = parsed.data;

    let result;
    try {
      result = await improve(goal, text, targetAudience);
    } catch (e) {
      const ai = describeAiError(e, "text");
      logError("improve", requestId, e, { goal, reason: ai.reason });
      return fail(ai.code, ai.message, requestId, {
        details: [{ path: "ai", message: ai.reason }],
        headers: ai.retryable ? { "retry-after": "5" } : undefined,
      });
    }

    let id: string | null = null;
    if (dbEnabled()) {
      try {
        const rec = await getPrisma().generation.create({
          data: {
            sessionId,
            kind: "IMPROVE",
            improveGoal: IMPROVE_GOAL_DB[goal],
            targetAudience: goal === "rewrite_for_audience" ? targetAudience : null,
            sourceText: text,
            outputText: result.improved,
            explanation: result.changeSummary,
            model: MODEL,
            promptStrategy: `improve_${goal}`,
            tokensUsed: result.usage.inputTokens + result.usage.outputTokens,
          },
          select: { id: true },
        });
        id = rec.id;
      } catch {
        // Non-fatal — still return the improved text.
      }
    }

    await track("improve", sessionId, isUser, { goal, saved: id !== null });

    return ok(
      {
        id,
        goal,
        improved: result.improved,
        changeSummary: result.changeSummary,
        saved: id !== null,
        usage: result.usage,
      },
      requestId,
    );
  } catch (e) {
    logError("improve", requestId, e);
    return fail("INTERNAL_ERROR", "Something went wrong.", requestId);
  }
}
