import { getSessionId } from "@/lib/session";
import { checkRateLimit } from "@/lib/rateLimit";
import { ok, fail, newRequestId, tooLarge } from "@/lib/http";
import { imageSchema, zodDetails, CONTENT_TYPE_WIRE } from "@/lib/validation";
import { imageEnabled } from "@/lib/ai/config";
import {
  buildImagePromptFromContent,
  generateImageB64,
  isWide,
} from "@/lib/ai/image";
import { describeAiError } from "@/lib/ai/errors";
import { blobEnabled, uploadPngFromBase64, deleteBlob } from "@/lib/blob";
import { dbEnabled, getPrisma } from "@/lib/db";
import { logError } from "@/lib/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60; // DALL·E 3 + b64 download + Blob upload can take a while

export async function POST(req: Request) {
  const requestId = newRequestId();
  try {
    const sessionId = await getSessionId();

    const rl = checkRateLimit(sessionId, "image");
    if (!rl.ok) {
      return fail("RATE_LIMITED", `Too many requests. Try again in ${rl.retryAfter}s.`, requestId, {
        headers: { "retry-after": String(rl.retryAfter) },
      });
    }

    if (tooLarge(req)) {
      return fail("PAYLOAD_TOO_LARGE", "Request body is too large.", requestId);
    }

    const body = await req.json().catch(() => null);
    const parsed = imageSchema.safeParse(body);
    if (!parsed.success) {
      const details = zodDetails(parsed.error);
      return fail("VALIDATION_ERROR", details[0]?.message ?? "Invalid input.", requestId, { details });
    }

    const { generationId, style } = parsed.data;

    // Resolve the subject. Prefer the stored generation (source of truth, and
    // ownership-scoped); otherwise fall back to the topic/tone in the request.
    let topic = parsed.data.topic?.trim() ?? "";
    let tone = parsed.data.tone?.trim() || "professional";
    let contentType = parsed.data.contentType;
    // The generated copy drives a content-aware image prompt. Prefer the stored
    // generation (source of truth, ownership-scoped); fall back to the request.
    let content = parsed.data.content?.trim() || null;

    if (generationId && dbEnabled()) {
      const row = await getPrisma().generation.findFirst({
        where: { id: generationId, sessionId },
        select: { topic: true, tone: true, contentType: true, outputText: true },
      });
      if (!row) {
        return fail("NOT_FOUND", "That content could not be found.", requestId);
      }
      topic = row.topic?.trim() || topic;
      tone = row.tone?.trim() || tone;
      contentType = row.contentType ? CONTENT_TYPE_WIRE[row.contentType] : contentType;
      content = row.outputText?.trim() || content;
    }

    if (!topic) {
      return fail("VALIDATION_ERROR", "A topic is required to build the image prompt.", requestId, {
        details: [{ path: "topic", message: "Required." }],
      });
    }
    if (!imageEnabled()) {
      return fail("CONFIG_ERROR", "Image generation is not configured (missing OPENAI_API_KEY).", requestId);
    }
    if (!blobEnabled()) {
      return fail("CONFIG_ERROR", "Image storage is not configured (missing BLOB_READ_WRITE_TOKEN).", requestId);
    }

    const { prompt, enhanced, scene } = await buildImagePromptFromContent({
      topic,
      tone,
      contentType,
      style,
      content,
      scene: parsed.data.scene,
    });
    const canAttach = Boolean(generationId) && dbEnabled();

    // Record a failure on the row (best-effort) so imageStatus/imageError reflect reality.
    async function markFailed(reason: string) {
      if (!canAttach) return;
      try {
        await getPrisma().generation.updateMany({
          where: { id: generationId as string, sessionId },
          data: { imageStatus: "FAILED", imageError: reason.slice(0, 300) },
        });
      } catch {
        /* ignore */
      }
    }

    let b64: string;
    try {
      b64 = await generateImageB64(prompt, isWide(contentType));
    } catch (e) {
      const ai = describeAiError(e, "image");
      logError("images.generate", requestId, e, { style, reason: ai.reason });
      await markFailed(`image_generation_failed: ${ai.reason}`);
      return fail(ai.code, ai.message, requestId, {
        details: [{ path: "image", message: ai.reason }],
        headers: ai.retryable ? { "retry-after": "5" } : undefined,
      });
    }

    let imageUrl: string;
    try {
      imageUrl = await uploadPngFromBase64(b64);
    } catch (e) {
      const detail = (e instanceof Error ? e.message : String(e)).slice(0, 300);
      logError("images.upload", requestId, e);
      await markFailed(`image_storage_failed: ${detail}`.slice(0, 300));
      return fail(
        "UPSTREAM_BLOB_ERROR",
        "The image was created but could not be saved. Please try again.",
        requestId,
        { details: [{ path: "blob", message: "storage_failed" }] },
      );
    }

    // Attach to the generation row. If the link fails, delete the orphan blob and
    // report the failure — never leave the user with an image that isn't persisted.
    if (canAttach) {
      let attached = false;
      try {
        const r = await getPrisma().generation.updateMany({
          where: { id: generationId as string, sessionId },
          data: {
            imageUrl,
            imagePrompt: prompt,
            imageStyle: style,
            imageStatus: "READY",
            imageError: null,
          },
        });
        attached = r.count > 0;
      } catch {
        attached = false;
      }
      if (!attached) {
        if (blobEnabled()) {
          try {
            await deleteBlob(imageUrl);
          } catch {
            /* ignore */
          }
        }
        return fail("UPSTREAM_BLOB_ERROR", "The image was created but could not be attached to your content. Please try again.", requestId);
      }
    }

    return ok(
      { imageUrl, prompt, style, saved: canAttach, enhanced, scene },
      requestId,
    );
  } catch (e) {
    logError("images", requestId, e);
    return fail("INTERNAL_ERROR", "Something went wrong.", requestId);
  }
}
