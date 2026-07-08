import { anthropic, MODEL } from "./config";
import type { GenerateInput } from "@/lib/validation";

type ContentType = GenerateInput["contentType"];
type Structured = Record<string, unknown>;

export type GenResult = {
  outputText: string;
  structured: Structured;
  promptStrategy: string;
  usage: { inputTokens: number; outputTokens: number };
};

// ── Per-type output shapes (what the model returns as strict JSON) ────────────
interface BlogOut {
  title: string;
  metaDescription: string;
  sections: { heading: string; body: string }[];
  conclusion: string;
  cta: string;
}
interface LinkedInOut {
  hook: string;
  body: string;
  softCta: string;
  hashtags: string[];
}
interface AdOut {
  variants: { angle: string; headline: string; body: string; cta: string }[];
}
interface EmailOut {
  subjectLines: string[];
  previewText: string;
  body: string;
  cta: string;
}

interface TypeConfig {
  promptStrategy: string;
  maxTokens: number;
  system: string;
  streamSystem: string;
  user: (i: GenerateInput) => string;
  schema: Record<string, unknown>;
  assemble: (s: Structured) => string;
}

const strObj = (props: Record<string, unknown>, required: string[]) => ({
  type: "object",
  additionalProperties: false,
  properties: props,
  required,
});
const str = { type: "string" };
// Bounded string array — encodes the "exactly N" / "N–M" invariants directly in
// the schema so the count is enforced at decode, not just requested in the prompt.
const strArrN = (minItems: number, maxItems: number) => ({
  type: "array",
  minItems,
  maxItems,
  items: { type: "string" },
});

const context = (i: GenerateInput) =>
  `TOPIC: ${i.topic}\nTONE: ${i.tone}\nTARGET AUDIENCE: ${i.audience}`;

const TYPES: Record<ContentType, TypeConfig> = {
  // ── BLOG POST — SEO long-form ───────────────────────────────────────────────
  blog_post: {
    promptStrategy: "blog_seo_v1",
    maxTokens: 4000,
    streamSystem: `You are a senior SEO content writer. Write a COMPLETE, ready-to-publish blog post in clean markdown: a scroll-earning hook, an H1 title (# ), descriptive ## H2 sections with short scannable paragraphs, and a conclusion with one concrete call to action. Match the requested tone and audience precisely. Be specific; never invent statistics. Aim for 700–1100 words. Output ONLY the finished markdown post — no preamble, no JSON, no code fences.`,
    system: `You are a senior SEO content strategist and long-form writer who ranks B2B and B2C articles on page one of Google. You write for humans first, search engines second.

Every blog post you write:
- Opens with a HOOK (1–3 sentences) that names the reader's pain or desire and creates an information gap. Never open with "In today's fast-paced world" or generic throat-clearing.
- Is organized into descriptive H2 sections that front-load the primary keyword naturally (never keyword-stuffed).
- Uses short, scannable paragraphs (2–4 sentences) with a clear takeaway per section.
- Ends with a conclusion that restates the core insight and gives ONE concrete next action.
- Includes a title under ~60 characters and a meta description under ~155 characters that includes the primary keyword and a benefit.

Match the requested tone and audience precisely. Be specific and evidence-oriented; prefer concrete examples and mechanisms over vague claims. Do not invent statistics. Target 700–1100 words across the sections. Output ONLY the JSON object matching the schema — no markdown fences, no preamble.`,
    user: (i) =>
      `Write a blog post.\n\n${context(i)}\n\nProduce the title, meta description, an ordered set of H2 sections with real body copy under each, a conclusion, and a single call to action.`,
    schema: strObj(
      {
        title: str,
        metaDescription: str,
        sections: {
          type: "array",
          minItems: 3,
          items: strObj({ heading: str, body: str }, ["heading", "body"]),
        },
        conclusion: str,
        cta: str,
      },
      ["title", "metaDescription", "sections", "conclusion", "cta"],
    ),
    assemble: (s) => {
      const d = s as unknown as BlogOut;
      const body = (d.sections ?? [])
        .map((x) => `## ${x.heading}\n\n${x.body}`)
        .join("\n\n");
      return `# ${d.title}\n\n${body}\n\n## Conclusion\n\n${d.conclusion}\n\n**${d.cta}**\n\n---\n_Meta description: ${d.metaDescription}_`;
    },
  },

  // ── LINKEDIN POST — hook + short lines + soft CTA + hashtags ─────────────────
  linkedin_post: {
    promptStrategy: "linkedin_hook_v1",
    maxTokens: 1200,
    streamSystem: `You are a top LinkedIn ghostwriter. Write a COMPLETE LinkedIn post: a scroll-stopping first line, then short single-sentence lines separated by blank lines, one clear idea, a soft engagement CTA (a question), and 3–5 specific hashtags on the final line. 120–220 words. Match tone and audience; no emoji spam. Output ONLY the finished post text — no preamble, no JSON, no code fences.`,
    system: `You are a LinkedIn ghostwriter who has grown founder and operator accounts past 50k followers. You understand the feed: the first line is everything, because the platform truncates after ~2 lines with "…see more".

Every post you write:
- HOOK: the first line must stop the scroll — a bold claim, a surprising number, a contrarian take, or a relatable tension. Never start with "I'm excited to share" or "I've been thinking about".
- SHORT LINES: single-sentence lines and 1–2 line paragraphs separated by blank lines. Whitespace is a feature.
- ONE IDEA, built toward a single point.
- A SOFT CTA that invites engagement (a question or gentle invitation), never a hard sell.
- 3–5 specific, relevant hashtags (avoid generic mega-tags like #business).

Length 120–220 words. Match tone and audience. No emoji spam. Output ONLY the JSON object matching the schema — no markdown fences.`,
    user: (i) =>
      `Write a LinkedIn post.\n\n${context(i)}\n\nGive the hook line, the body written in short lines with blank-line spacing, a soft CTA, and 3–5 hashtags (without the # is fine).`,
    schema: strObj(
      { hook: str, body: str, softCta: str, hashtags: strArrN(3, 5) },
      ["hook", "body", "softCta", "hashtags"],
    ),
    assemble: (s) => {
      const d = s as unknown as LinkedInOut;
      const tags = (d.hashtags ?? [])
        .map((h) => (h.startsWith("#") ? h : `#${h.replace(/^#*/, "")}`))
        .join(" ");
      return `${d.hook}\n\n${d.body}\n\n${d.softCta ?? ""}\n\n${tags}`.trim();
    },
  },

  // ── AD COPY — 3 distinct variants ───────────────────────────────────────────
  ad_copy: {
    promptStrategy: "ad_directresponse_v1",
    maxTokens: 1600,
    streamSystem: `You are a direct-response copywriter. Write EXACTLY THREE distinct ad variants, each attacking a different psychological angle. Format each in markdown as: "**Variant N — <angle>**", then "Headline: ...", a 1–3 sentence body, then "CTA: ...". Benefit-led and thumb-stopping; no fake urgency or unverifiable superlatives. Match tone and audience. Output ONLY the finished markdown — no preamble, no JSON, no code fences.`,
    system: `You are a direct-response copywriter in the tradition of Ogilvy and Halbert, writing ads that convert cold traffic on Meta, Google, and paid social.

Produce exactly THREE distinct ad variants so the marketer can A/B test. Each variant must attack the offer from a DIFFERENT psychological angle — pick three of: pain/agitate/solve, aspiration/transformation, social proof/credibility, urgency/scarcity, curiosity/pattern-interrupt.

Each variant has:
- HEADLINE: benefit-forward, thumb-stopping, ideally ≤ 40 characters.
- BODY: 1–3 sentences — lead with the benefit, name the mechanism, handle one objection.
- CTA: a short action phrase (2–5 words).

Variants must be genuinely different in angle AND wording — do not reword the same sentence three times. Label each variant's angle. No unverifiable superlatives, no policy-violating fake urgency. Match tone and audience. Output ONLY the JSON object matching the schema — no markdown fences.`,
    user: (i) =>
      `Write ad copy.\n\nTOPIC / OFFER: ${i.topic}\nTONE: ${i.tone}\nTARGET AUDIENCE: ${i.audience}\n\nProduce three distinct variants. For each, give the angle name, headline, body, and CTA.`,
    schema: strObj(
      {
        variants: {
          type: "array",
          minItems: 3,
          maxItems: 3,
          items: strObj(
            { angle: str, headline: str, body: str, cta: str },
            ["angle", "headline", "body", "cta"],
          ),
        },
      },
      ["variants"],
    ),
    assemble: (s) => {
      const d = s as unknown as AdOut;
      return (d.variants ?? [])
        .map(
          (v, n) =>
            `Variant ${n + 1} — ${v.angle}\nHeadline: ${v.headline}\n${v.body}\nCTA: ${v.cta}`,
        )
        .join("\n\n———\n\n");
    },
  },

  // ── EMAIL — subject lines + preview + body + CTA ────────────────────────────
  email: {
    promptStrategy: "email_lifecycle_v1",
    maxTokens: 1400,
    streamSystem: `You are a lifecycle email copywriter. Write a COMPLETE marketing email in markdown: 3 subject-line options (labelled "Subject 1/2/3"), a "Preview:" line, a warm scannable body that opens with "Hi {firstName}," and builds to a single primary CTA. Keep it under ~200 words. Match tone and audience. Output ONLY the finished markdown — no preamble, no JSON, no code fences.`,
    system: `You are a lifecycle and campaign email copywriter. The subject line and preview text decide whether the email is opened; the body decides whether it converts.

Every email you write includes:
- SUBJECT LINES: exactly 3 options in different styles (curiosity, benefit-direct, personal/short), each ideally ≤ 50 characters.
- PREVIEW TEXT: ≤ 90 characters, complements the chosen subject (does not repeat it) and adds a reason to open.
- BODY: warm and scannable. Open with a hook tied to the reader's context, deliver value in short paragraphs, build toward a single primary action. Use a "Hi {firstName}," greeting placeholder.
- A single PRIMARY CTA — do not dilute with competing CTAs.

Keep the body under ~200 words unless the topic truly requires more. One idea, one ask. Match tone and audience. Output ONLY the JSON object matching the schema — no markdown fences.`,
    user: (i) =>
      `Write a marketing email.\n\nTOPIC / PURPOSE: ${i.topic}\nTONE: ${i.tone}\nTARGET AUDIENCE: ${i.audience}\n\nGive 3 subject line options, the preview text, the email body (with a {firstName} greeting placeholder), and one primary CTA.`,
    schema: strObj(
      {
        subjectLines: strArrN(3, 3),
        previewText: str,
        body: str,
        cta: str,
      },
      ["subjectLines", "previewText", "body", "cta"],
    ),
    assemble: (s) => {
      const d = s as unknown as EmailOut;
      const subjects = (d.subjectLines ?? [])
        .map((x, n) => `  ${n + 1}. ${x}`)
        .join("\n");
      return `SUBJECT LINE OPTIONS:\n${subjects}\n\nPREVIEW: ${d.previewText}\n\n———\n\n${d.body}\n\n[ ${d.cta} ]`;
    },
  },
};

/**
 * Generate polished content for a content type using its distinct prompt
 * strategy and a strict JSON output schema, then assemble the copy-paste text.
 */
// Catches degenerate structured decodes that can slip through json_schema at
// HTTP 200 — required fields stub-filled with "placeholder", left empty, or an
// empty required array. We retry once, and fail loudly rather than persist junk.
const STUB = /^\s*(placeholder|lorem ipsum|tbd|todo|n\/?a|xxx+|\.{3,})\s*$/i;

function isDegenerate(s: Structured): boolean {
  let hasContent = false;
  let bad = false;
  const walk = (v: unknown) => {
    if (typeof v === "string") {
      if (v.trim()) hasContent = true;
      if (STUB.test(v)) bad = true;
    } else if (Array.isArray(v)) {
      if (v.length === 0) bad = true;
      v.forEach(walk);
    } else if (v && typeof v === "object") {
      Object.values(v).forEach(walk);
    }
  };
  walk(s);
  return bad || !hasContent;
}

// Assert the per-type array-count invariants in code (not just in the prompt):
// exactly 3 ad variants, exactly 3 subject lines, 3–5 hashtags, ≥3 blog sections.
function hasValidCounts(ct: ContentType, s: Structured): boolean {
  const len = (v: unknown) => (Array.isArray(v) ? v.length : -1);
  const o = s as Record<string, unknown>;
  if (ct === "ad_copy") return len(o.variants) === 3;
  if (ct === "email") return len(o.subjectLines) === 3;
  if (ct === "linkedin_post") {
    const n = len(o.hashtags);
    return n >= 3 && n <= 5;
  }
  if (ct === "blog_post") return len(o.sections) >= 3;
  return true;
}

export async function generate(
  contentType: ContentType,
  input: GenerateInput,
  brandVoice?: string,
): Promise<GenResult> {
  const cfg = TYPES[contentType];
  const userContent = brandVoice
    ? `${cfg.user(input)}\n\n${brandVoice}`
    : cfg.user(input);

  let lastError = "generation_failed";
  // Up to 2 attempts: strict json_schema decoding occasionally stub-fills fields.
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await anthropic().messages.create({
      model: MODEL,
      max_tokens: cfg.maxTokens,
      system: cfg.system,
      thinking: { type: "disabled" },
      output_config: { format: { type: "json_schema", schema: cfg.schema } },
      messages: [{ role: "user", content: userContent }],
    });

    if (res.stop_reason === "refusal") throw new Error("refusal");

    const block = res.content.find((b) => b.type === "text");
    const raw = block && block.type === "text" ? block.text : "";

    let structured: Structured;
    try {
      structured = JSON.parse(raw) as Structured;
    } catch {
      lastError = "parse_failed";
      continue;
    }
    if (isDegenerate(structured)) {
      lastError = "degenerate_output";
      continue;
    }
    if (!hasValidCounts(contentType, structured)) {
      lastError = "wrong_count";
      continue;
    }

    return {
      outputText: cfg.assemble(structured),
      structured,
      promptStrategy: cfg.promptStrategy,
      usage: {
        inputTokens: res.usage.input_tokens,
        outputTokens: res.usage.output_tokens,
      },
    };
  }
  throw new Error(lastError);
}

/**
 * Prompt config for the streaming path — uses a markdown-output system prompt so
 * tokens can be streamed live to the client (no JSON schema to buffer first).
 */
/**
 * Post-stream sanity check for the streaming path (which can't use json_schema).
 * Returns a reason string if the streamed markdown looks unusable, else null —
 * so the route can refuse to persist junk and tell the user to retry.
 */
export function streamedOutputIssue(
  contentType: ContentType,
  text: string,
): string | null {
  const t = text.trim();
  if (t.length < 40) return "too_short";
  if (/^\s*(placeholder|lorem ipsum|tbd|n\/?a|todo)\s*$/i.test(t)) return "stub";
  // Enforce the per-type count invariants on the STREAMED markdown (the live
  // path can't use json_schema), matching the structured schemas: ad = 3
  // variants, email = 3 subject lines, blog ≥ 3 H2 sections, LinkedIn ≥ 3 tags.
  const count = (re: RegExp) => (t.match(re) || []).length;
  // Only enforce counts we can detect reliably from the streamed markdown:
  // ad "Variant N", email "Subject N", blog "## H2". LinkedIn hashtags are NOT
  // reliably marked (the format allows omitting the '#'), so counting them here
  // produces false positives that would reject valid posts — don't guard it.
  if (contentType === "ad_copy" && count(/variant\s*\d/gi) < 3)
    return "too_few_ad_variants";
  if (contentType === "email" && count(/subject\s*\d/gi) < 3)
    return "too_few_subject_lines";
  if (contentType === "blog_post" && count(/^#{2,3}\s+/gm) < 3)
    return "too_few_sections";
  return null;
}

export function getStreamConfig(
  contentType: ContentType,
  input: GenerateInput,
  brandVoice?: string,
): { system: string; user: string; maxTokens: number; promptStrategy: string } {
  const cfg = TYPES[contentType];
  const user = brandVoice
    ? `${cfg.user(input)}\n\n${brandVoice}`
    : cfg.user(input);
  return {
    system: cfg.streamSystem,
    user,
    maxTokens: cfg.maxTokens,
    promptStrategy: cfg.promptStrategy,
  };
}
