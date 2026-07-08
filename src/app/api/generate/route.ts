import { getActor } from "@/lib/session";
import { track } from "@/lib/track";
import { checkRateLimit } from "@/lib/rateLimit";
import { acquireAiSlot, releaseAiSlot } from "@/lib/concurrency";
import { fail, newRequestId, tooLarge } from "@/lib/http";
import {
  generateSchema,
  zodDetails,
  CONTENT_TYPE_DB,
  formatBrandVoice,
  findAvoidedWords,
} from "@/lib/validation";
import { aiEnabled, anthropic, MODEL } from "@/lib/ai/config";
import { getStreamConfig, streamedOutputIssue } from "@/lib/ai/generate";
import { screenContent, parseRefusal, REFUSAL_SENTINEL } from "@/lib/ai/moderation";
import { describeAiError } from "@/lib/ai/errors";
import { textCost } from "@/lib/pricing";
import { dbEnabled, getPrisma } from "@/lib/db";
import { logError, logWarn } from "@/lib/log";

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

    // Content safety: block clearly-harmful requests before spending an AI call.
    const mod = screenContent(`${topic}\n${audience}`);
    if (mod.blocked) {
      logWarn("generate", requestId, "blocked by moderation", { category: mod.category });
      return fail("CONTENT_BLOCKED", mod.message ?? "That request can't be processed.", requestId, {
        details: [{ path: "topic", message: mod.category ?? "unsafe" }],
      });
    }

    const brandVoiceText = parsed.data.brandVoice
      ? formatBrandVoice(parsed.data.brandVoice)
      : undefined;
    const { system, user, maxTokens, promptStrategy } = getStreamConfig(
      contentType,
      parsed.data,
      brandVoiceText,
    );

    // One in-flight AI request per session. A second concurrent generate is
    // rejected here rather than fanned out into another billable model call.
    if (!(await acquireAiSlot(sessionId))) {
      return fail(
        "CONCURRENT_REQUEST",
        "You already have a request in progress. Please wait for it to finish before starting another.",
        requestId,
      );
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        let full = "";
        let flushed = false; // have we started streaming real copy to the client?
        let pending = ""; // buffered opening, held until the refusal decision
        let inputTokens = 0;
        let outputTokens = 0;
        try {
        try {
          const s = anthropic().messages.stream({
            model: MODEL,
            max_tokens: maxTokens,
            system,
            thinking: { type: "disabled" },
            messages: [{ role: "user", content: user }],
          });
          for await (const event of s) {
            // Token usage arrives on the message frames, not the text deltas.
            if (event.type === "message_start") {
              inputTokens = event.message.usage?.input_tokens ?? 0;
            } else if (event.type === "message_delta") {
              outputTokens = event.usage?.output_tokens ?? outputTokens;
            }
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              const text = event.delta.text;
              full += text;
              if (flushed) {
                controller.enqueue(encoder.encode(text));
                continue;
              }
              // Hold the opening until we can tell a safety refusal from real
              // copy — so a "⟦REFUSED⟧ …" reply is never streamed to the user.
              pending += text;
              const head = pending.trimStart();
              if (head.length > REFUSAL_SENTINEL.length || pending.includes("\n")) {
                if (head.startsWith(REFUSAL_SENTINEL)) break; // refusal — stop early
                controller.enqueue(encoder.encode(pending));
                pending = "";
                flushed = true;
              }
            }
          }
        } catch (e) {
          const ai = describeAiError(e, "text");
          logError("generate", requestId, e, { contentType, reason: ai.reason });
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

        // Safety refusal: if we never flushed real copy and the output is a
        // refusal (the sentinel, or an English "I can't help…"), surface it as a
        // clean CONTENT_BLOCKED — never stream or persist the refusal as content.
        const refusalReason = flushed ? null : parseRefusal(full);
        if (refusalReason) {
          logWarn("generate", requestId, "model refused", { contentType });
          controller.enqueue(
            encoder.encode(
              SEP +
                JSON.stringify({
                  error: `We can't create that — ${refusalReason.replace(/[.\s]+$/, "")}. Please try a different topic.`,
                  code: "CONTENT_BLOCKED",
                  retryable: false,
                }),
            ),
          );
          controller.close();
          return;
        }

        // Flush any still-buffered opening (short, non-refusal output).
        if (!flushed && pending) {
          controller.enqueue(encoder.encode(pending));
          flushed = true;
        }

        // Guard the streaming path (no json_schema here): if the finished copy
        // looks unusable, refuse to persist it and tell the client to retry.
        const issue = streamedOutputIssue(contentType, full);
        if (issue) {
          logWarn("generate", requestId, "unusable stream output", { contentType, issue });
          controller.enqueue(
            encoder.encode(
              SEP +
                JSON.stringify({
                  error:
                    "The result came back incomplete. Please try generating again.",
                  code: issue,
                  retryable: true,
                }),
            ),
          );
          controller.close();
          return;
        }

        // Token usage → USD cost for this generation.
        const tokensUsed = inputTokens + outputTokens;
        const costUsd = textCost(MODEL, inputTokens, outputTokens);

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
                tokensUsed,
                costUsd,
              },
              select: { id: true },
            });
            id = rec.id;
          } catch (e) {
            logError("generate.persist", requestId, e, { contentType });
          }
        }

        // Record the action for the admin dashboard (best-effort, non-fatal).
        await track("text_generate", sessionId, isUser, { contentType, saved: id !== null });

        // Hard brand-voice check: which "avoid" words slipped into the output.
        const avoided = parsed.data.brandVoice?.avoid?.length
          ? findAvoidedWords(full, parsed.data.brandVoice.avoid)
          : [];

        controller.enqueue(
          encoder.encode(
            SEP +
              JSON.stringify({
                id,
                contentType,
                saved: id !== null,
                avoided,
                usage: { model: MODEL, inputTokens, outputTokens, tokensUsed, costUsd },
              }),
          ),
        );
        controller.close();
        } finally {
          // Always free the session's AI slot once the stream ends — success,
          // early refusal, AI error, or unusable output all funnel through here.
          await releaseAiSlot(sessionId);
        }
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
  } catch (e) {
    logError("generate", requestId, e);
    return fail("INTERNAL_ERROR", "Something went wrong.", requestId);
  }
}
