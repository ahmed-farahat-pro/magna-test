import { getSessionId } from "@/lib/session";
import { checkRateLimit } from "@/lib/rateLimit";
import { fail, newRequestId } from "@/lib/http";
import {
  generateSchema,
  zodDetails,
  CONTENT_TYPE_DB,
  formatBrandVoice,
} from "@/lib/validation";
import { aiEnabled, anthropic, MODEL } from "@/lib/ai/config";
import { getStreamConfig } from "@/lib/ai/generate";
import { describeAiError } from "@/lib/ai/errors";
import { dbEnabled, getPrisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Record-separator delimiter between the streamed text and the JSON trailer.
const SEP = String.fromCharCode(30); // U+001E

// Streams the generated copy token-by-token (text/plain). The final chunk is
// SEP followed by a JSON trailer: { id, contentType, saved } (or { error }).
// Validation / rate-limit / config failures return before the stream begins as
// normal JSON errors, so the client checks res.ok first.
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
    const brandVoiceText = parsed.data.brandVoice
      ? formatBrandVoice(parsed.data.brandVoice)
      : undefined;
    const { system, user, maxTokens, promptStrategy } = getStreamConfig(
      contentType,
      parsed.data,
      brandVoiceText,
    );

    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        let full = "";
        try {
          const s = anthropic().messages.stream({
            model: MODEL,
            max_tokens: maxTokens,
            system,
            thinking: { type: "disabled" },
            messages: [{ role: "user", content: user }],
          });
          for await (const event of s) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              full += event.delta.text;
              controller.enqueue(encoder.encode(event.delta.text));
            }
          }
        } catch (e) {
          const ai = describeAiError(e, "text");
          controller.enqueue(
            encoder.encode(
              SEP +
                JSON.stringify({
                  error: ai.message,
                  code: ai.reason,
                  retryable: ai.retryable,
                }),
            ),
          );
          controller.close();
          return;
        }

        // Persist the finished text (best-effort).
        let id: string | null = null;
        if (dbEnabled() && full.trim()) {
          try {
            const rec = await getPrisma().generation.create({
              data: {
                sessionId,
                kind: "GENERATE",
                contentType: CONTENT_TYPE_DB[contentType],
                topic,
                tone,
                targetAudience: audience,
                outputText: full,
                model: MODEL,
                promptStrategy,
              },
              select: { id: true },
            });
            id = rec.id;
          } catch {
            /* swallow persistence errors */
          }
        }

        controller.enqueue(
          encoder.encode(
            SEP + JSON.stringify({ id, contentType, saved: id !== null }),
          ),
        );
        controller.close();
      },
    });

    return new Response(stream, {
      status: 200,
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "x-request-id": requestId,
        "cache-control": "no-store",
        "x-accel-buffering": "no",
      },
    });
  } catch {
    return fail("INTERNAL_ERROR", "Something went wrong.", requestId);
  }
}
