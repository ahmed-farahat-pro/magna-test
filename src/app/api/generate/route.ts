import { getSessionId } from "@/lib/session";
import { checkRateLimit } from "@/lib/rateLimit";
import { ok, fail, newRequestId } from "@/lib/http";
import {
  generateSchema,
  zodDetails,
  CONTENT_TYPE_DB,
} from "@/lib/validation";
import { aiEnabled, MODEL } from "@/lib/ai/config";
import { generate } from "@/lib/ai/generate";
import { dbEnabled, getPrisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const requestId = newRequestId();
  try {
    const sessionId = await getSessionId();

    const rl = checkRateLimit(sessionId, "generate");
    if (!rl.ok) {
      return fail("RATE_LIMITED", `Too many requests. Try again in ${rl.retryAfter}s.`, requestId, {
        headers: { "retry-after": String(rl.retryAfter) },
      });
    }

    const body = await req.json().catch(() => null);
    const parsed = generateSchema.safeParse(body);
    if (!parsed.success) {
      const details = zodDetails(parsed.error);
      return fail("VALIDATION_ERROR", details[0]?.message ?? "Invalid input.", requestId, { details });
    }

    if (!aiEnabled()) {
      return fail(
        "CONFIG_ERROR",
        "AI is not configured on the server yet. Add ANTHROPIC_API_KEY in the environment.",
        requestId,
      );
    }

    const { contentType, topic, tone, audience } = parsed.data;

    let result;
    try {
      result = await generate(contentType, parsed.data);
    } catch {
      return fail(
        "UPSTREAM_LLM_ERROR",
        "The AI service could not generate content just now. Please try again.",
        requestId,
      );
    }

    // Best-effort persistence: the generator still works before the DB is wired.
    let id: string | null = null;
    if (dbEnabled()) {
      try {
        const rec = await getPrisma().generation.create({
          data: {
            sessionId,
            kind: "GENERATE",
            contentType: CONTENT_TYPE_DB[contentType],
            topic,
            tone,
            targetAudience: audience,
            outputText: result.outputText,
            model: MODEL,
            promptStrategy: result.promptStrategy,
            tokensUsed: result.usage.inputTokens + result.usage.outputTokens,
          },
          select: { id: true },
        });
        id = rec.id;
      } catch {
        // Swallow persistence errors — return the content regardless.
      }
    }

    return ok(
      {
        id,
        contentType,
        outputText: result.outputText,
        structured: result.structured,
        saved: id !== null,
        usage: result.usage,
      },
      requestId,
    );
  } catch {
    return fail("INTERNAL_ERROR", "Something went wrong.", requestId);
  }
}
