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

/** Turn a ZodError into the API's `details[]` shape. */
export function zodDetails(
  error: z.ZodError,
): { path: string; message: string }[] {
  return error.issues.map((i) => ({
    path: i.path.join(".") || "(body)",
    message: i.message,
  }));
}
