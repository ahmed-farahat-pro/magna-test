import { z } from "zod";

// Wire values are lower_snake; the DB enums are UPPERCASE. Map at this boundary.
export const TONES = [
  "professional",
  "casual",
  "witty",
  "authoritative",
  "friendly",
  "bold",
] as const;

export const CONTENT_TYPES = [
  "blog_post",
  "linkedin_post",
  "ad_copy",
  "email",
] as const;

// Brand voice (bonus) — passed from the client and injected into the prompt.
export const brandVoiceSchema = z.object({
  name: z.string().trim().min(1).max(60),
  personality: z.array(z.string().trim().min(1).max(40)).max(12).optional(),
  formality: z.string().trim().max(40).optional(),
  industry: z.string().trim().max(60).optional(),
  description: z.string().trim().max(500).optional(),
  keywords: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
  avoid: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
});

export const generateSchema = z.object({
  topic: z.string().trim().min(1, "Topic is required.").max(200),
  tone: z.enum(TONES),
  audience: z.string().trim().min(1, "Target audience is required.").max(120),
  contentType: z.enum(CONTENT_TYPES),
  brandVoice: brandVoiceSchema.optional(),
});

export function formatBrandVoice(
  bv: z.infer<typeof brandVoiceSchema>,
): string {
  const lines = [
    "BRAND VOICE — write this in the following brand's voice:",
    `Brand: ${bv.name}`,
  ];
  if (bv.personality?.length)
    lines.push(`Personality: ${bv.personality.join(", ")}`);
  if (bv.formality) lines.push(`Formality: ${bv.formality}`);
  if (bv.industry) lines.push(`Industry context: ${bv.industry}`);
  if (bv.description) lines.push(`Voice & style notes: ${bv.description}`);
  if (bv.keywords?.length) lines.push(`Emphasize: ${bv.keywords.join(", ")}`);
  if (bv.avoid?.length)
    lines.push(`Avoid these words/phrases: ${bv.avoid.join(", ")}`);
  return lines.join("\n");
}

export type GenerateInput = z.infer<typeof generateSchema>;

export const CONTENT_TYPE_DB = {
  blog_post: "BLOG_POST",
  linkedin_post: "LINKEDIN_POST",
  ad_copy: "AD_COPY",
  email: "EMAIL",
} as const;

export const CONTENT_TYPE_WIRE = {
  BLOG_POST: "blog_post",
  LINKEDIN_POST: "linkedin_post",
  AD_COPY: "ad_copy",
  EMAIL: "email",
} as const;

// Image style presets (wire values). Each maps to a distinct set of visual
// modifiers server-side — see src/lib/ai/image.ts.
export const IMAGE_STYLES = [
  "photographic",
  "3d_render",
  "flat_illustration",
  "minimalist",
  "bold_gradient",
  "editorial",
] as const;

export const imageSchema = z.object({
  generationId: z.string().trim().min(1).optional(),
  topic: z.string().trim().max(200).optional(),
  tone: z.string().trim().max(40).optional(),
  contentType: z.enum(CONTENT_TYPES).optional(),
  style: z.enum(IMAGE_STYLES),
});

export type ImageInput = z.infer<typeof imageSchema>;

// ── Content Improver ─────────────────────────────────────────────────────────
export const IMPROVE_GOALS = [
  "shorter",
  "more_persuasive",
  "more_formal",
  "seo_optimized",
  "rewrite_for_audience",
] as const;

export const IMPROVE_GOAL_DB = {
  shorter: "SHORTER",
  more_persuasive: "MORE_PERSUASIVE",
  more_formal: "MORE_FORMAL",
  seo_optimized: "SEO_OPTIMIZED",
  rewrite_for_audience: "REWRITE_FOR_AUDIENCE",
} as const;

export const improveSchema = z
  .object({
    text: z
      .string()
      .trim()
      .min(1, "Paste some text to improve.")
      .max(12000, "Text exceeds the 12,000 character limit."),
    goal: z.enum(IMPROVE_GOALS),
    targetAudience: z.string().trim().max(120).optional(),
  })
  .refine((d) => d.goal !== "rewrite_for_audience" || !!d.targetAudience, {
    path: ["targetAudience"],
    message: "A target audience is required to rewrite for a new audience.",
  });

export type ImproveInput = z.infer<typeof improveSchema>;

// ── History ──────────────────────────────────────────────────────────────────
export const historyQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(12),
});

/** Turn a ZodError into the API's `details[]` shape. */
export function zodDetails(
  error: z.ZodError,
): { path: string; message: string }[] {
  return error.issues.map((i) => ({
    path: i.path.join(".") || "(body)",
    message: i.message,
  }));
}
