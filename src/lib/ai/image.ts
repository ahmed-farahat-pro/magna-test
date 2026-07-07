import { openai } from "./config";
import { IMAGE_STYLES, CONTENT_TYPES } from "@/lib/validation";

type ImageStyle = (typeof IMAGE_STYLES)[number];
type ContentType = (typeof CONTENT_TYPES)[number];

const STYLE_PRESETS: Record<
  ImageStyle,
  { leadNoun: string; color: string; modifiers: string }
> = {
  photographic: {
    leadNoun: "photorealistic scene",
    color: "naturalistic, true-to-life color palette",
    modifiers:
      "shot on a full-frame DSLR, 50mm lens, shallow depth of field, sharp focus, high detail, professional photography",
  },
  "3d_render": {
    leadNoun: "polished 3D rendered scene",
    color: "vibrant saturated colors with soft global illumination",
    modifiers:
      "octane render, physically based rendering, smooth rounded shapes, glossy materials, subtle ambient occlusion, modern 3D illustration",
  },
  flat_illustration: {
    leadNoun: "flat vector illustration",
    color: "bold, cohesive palette of 3–4 flat colors",
    modifiers:
      "clean geometric shapes, no gradients, consistent line weights, modern corporate illustration style, crisp edges",
  },
  minimalist: {
    leadNoun: "minimalist composition",
    color: "restrained two-tone palette with lots of white space",
    modifiers:
      "extreme simplicity, a single focal element, generous negative space, elegant and premium feel",
  },
  bold_gradient: {
    leadNoun: "abstract gradient-driven composition",
    color: "vivid multi-stop gradients, high energy",
    modifiers:
      "smooth flowing gradient mesh, glowing abstract shapes, modern tech-brand aesthetic, dynamic and futuristic",
  },
  editorial: {
    leadNoun: "editorial-style photograph",
    color: "muted, sophisticated color grade with filmic tones",
    modifiers:
      "magazine editorial photography, cinematic color grading, natural textures, aspirational lifestyle feel",
  },
};

const COMPOSITION: Record<ContentType, string> = {
  blog_post:
    "wide hero composition with clear negative space for a headline, balanced rule-of-thirds framing",
  ad_copy:
    "eye-catching centered subject with strong focal hierarchy and high, thumb-stopping contrast",
  linkedin_post:
    "single clear focal subject, uncluttered background that reads well at small feed sizes",
  email:
    "clean banner-style composition, friendly and inviting, subject slightly off-center with breathing room",
};

/** Deterministically build a rich DALL·E 3 prompt from the content's topic + tone. */
export function buildImagePrompt(input: {
  topic: string;
  tone: string;
  contentType?: ContentType;
  style: ImageStyle;
}): string {
  const preset = STYLE_PRESETS[input.style];
  const composition = input.contentType
    ? COMPOSITION[input.contentType]
    : "balanced, well-composed framing with a clear focal subject";

  const lighting = /dark|serious|bold|dramatic/i.test(input.tone)
    ? "dramatic directional lighting with deep shadows and strong contrast"
    : /calm|trust|professional|formal|authoritative/i.test(input.tone)
      ? "soft even lighting, gentle highlights, clean and trustworthy"
      : "bright natural lighting, warm and energetic";

  return (
    [
      `A ${preset.leadNoun} representing "${input.topic}"`,
      `conveying a ${input.tone} mood`,
      composition,
      lighting,
      preset.color,
      preset.modifiers,
      "No text, no words, no letters, no logos, no watermark, no UI elements.",
    ].join(". ") + "."
  );
}

/** Wide hero for blog/ad, square for social/email. */
export function isWide(contentType?: ContentType): boolean {
  return contentType === "blog_post" || contentType === "ad_copy";
}

// Accounts vary in which image models they can access (dall-e-3 may be
// unavailable; gpt-image-1 can require org verification; dall-e-2 is broadly
// available). Try the best one and fall back automatically. An explicit
// OPENAI_IMAGE_MODEL env var, if set, is tried first.
const IMAGE_MODELS: { model: string; square: string; wide: string }[] = [
  ...(process.env.OPENAI_IMAGE_MODEL
    ? [
        {
          model: process.env.OPENAI_IMAGE_MODEL,
          square: "1024x1024",
          wide: "1024x1024",
        },
      ]
    : []),
  { model: "gpt-image-1", square: "1024x1024", wide: "1536x1024" },
  { model: "dall-e-3", square: "1024x1024", wide: "1792x1024" },
  { model: "dall-e-2", square: "1024x1024", wide: "1024x1024" },
];

const AVAILABILITY =
  /does not exist|not found|must be verified|do not have access|model_not_found|unsupported|not supported/i;

/** Generate an image and return raw base64 PNG (for re-hosting on Blob). */
export async function generateImageB64(
  prompt: string,
  wide: boolean,
): Promise<string> {
  let lastErr: unknown;
  for (const m of IMAGE_MODELS) {
    try {
      // The current OpenAI images API rejects `response_format`; models return a
      // temporary URL (or b64). We normalize to base64 for permanent Blob hosting.
      const res = await openai().images.generate({
        model: m.model,
        prompt,
        n: 1,
        size: wide ? m.wide : m.square,
      });
      const d = res.data?.[0];
      if (d?.b64_json) return d.b64_json;
      if (d?.url) {
        const r = await fetch(d.url);
        if (!r.ok) throw new Error(`image fetch failed: ${r.status}`);
        return Buffer.from(await r.arrayBuffer()).toString("base64");
      }
      throw new Error("empty image response");
    } catch (e) {
      lastErr = e;
      const msg = e instanceof Error ? e.message : String(e);
      // Only fall through to the next model for availability/verification errors;
      // for real errors (content policy, quota) stop and surface it.
      if (!AVAILABILITY.test(msg)) throw e;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("image generation failed");
}
