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
export function imageSize(contentType?: ContentType): "1024x1024" | "1792x1024" {
  return contentType === "blog_post" || contentType === "ad_copy"
    ? "1792x1024"
    : "1024x1024";
}

/** Call DALL·E 3 and return the raw base64 PNG (for re-hosting on Blob). */
export async function generateImageB64(
  prompt: string,
  size: "1024x1024" | "1792x1024",
): Promise<string> {
  const res = await openai().images.generate({
    model: "dall-e-3",
    prompt,
    n: 1,
    size,
    response_format: "b64_json",
  });
  const b64 = res.data?.[0]?.b64_json;
  if (!b64) throw new Error("no_image");
  return b64;
}
