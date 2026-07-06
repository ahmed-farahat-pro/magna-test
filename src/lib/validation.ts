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

export const generateSchema = z.object({
  topic: z.string().trim().min(1, "Topic is required.").max(200),
  tone: z.enum(TONES),
  audience: z.string().trim().min(1, "Target audience is required.").max(120),
  contentType: z.enum(CONTENT_TYPES),
});

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

/** Turn a ZodError into the API's `details[]` shape. */
export function zodDetails(
  error: z.ZodError,
): { path: string; message: string }[] {
  return error.issues.map((i) => ({
    path: i.path.join(".") || "(body)",
    message: i.message,
  }));
}
