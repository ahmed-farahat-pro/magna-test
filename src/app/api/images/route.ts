import { getSessionId } from "@/lib/session";
import { checkRateLimit } from "@/lib/rateLimit";
import { ok, fail, newRequestId } from "@/lib/http";
import { imageSchema, zodDetails, CONTENT_TYPE_WIRE } from "@/lib/validation";
import { imageEnabled } from "@/lib/ai/config";
import { buildImagePrompt, generateImageB64, imageSize } from "@/lib/ai/image";
import { blobEnabled, uploadPngFromBase64 } from "@/lib/blob";
import { dbEnabled, getPrisma } from "@/lib/db";

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

    if (generationId && dbEnabled()) {
      const row = await getPrisma().generation.findFirst({
        where: { id: generationId, sessionId },
        select: { topic: true, tone: true, contentType: true },
      });
      if (!row) {
        return fail("NOT_FOUND", "That content could not be found.", requestId);
      }
      topic = row.topic?.trim() || topic;
      tone = row.tone?.trim() || tone;
      contentType = row.contentType ? CONTENT_TYPE_WIRE[row.contentType] : contentType;
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

    const prompt = buildImagePrompt({ topic, tone, contentType, style });

    let b64: string;
    try {
      b64 = await generateImageB64(prompt, imageSize(contentType));
    } catch {
      return fail("UPSTREAM_IMAGE_ERROR", "The image service could not create an image. Try a different style or topic.", requestId);
    }

    let imageUrl: string;
    try {
      imageUrl = await uploadPngFromBase64(b64);
    } catch {
      return fail("UPSTREAM_BLOB_ERROR", "The image was created but could not be saved. Please try again.", requestId);
    }

    // Attach to the generation row when we have one.
    if (generationId && dbEnabled()) {
      try {
        await getPrisma().generation.updateMany({
          where: { id: generationId, sessionId },
          data: {
            imageUrl,
            imagePrompt: prompt,
            imageStyle: style,
            imageStatus: "READY",
          },
        });
      } catch {
        // Non-fatal — still return the image to the client.
      }
    }

    return ok({ imageUrl, prompt, style }, requestId);
  } catch {
    return fail("INTERNAL_ERROR", "Something went wrong.", requestId);
  }
}
