// Content safety for the marketing generator. Two layers work together:
//
//   1. screenContent()  — a fast, deterministic pre-filter that blocks clearly
//      harmful REQUESTS before we ever spend an AI call. It is deliberately
//      HIGH-PRECISION: it keys on harmful *intent* (e.g. "how to build a bomb"),
//      never on lone violent words, so ordinary competitive marketing language
//      ("crush the competition", "killer feature", "explosive growth", "kill it
//      at the gym") is never falsely blocked.
//
//   2. parseRefusal()   — catches the nuanced cases the regex can't judge. The
//      model is instructed to emit REFUSAL_SENTINEL when it declines; we detect
//      that (and an English-refusal fallback) and turn Claude's own refusal into
//      a clean, typed error instead of streaming/saving a refusal as "content".

export type ModerationResult = {
  blocked: boolean;
  category?: string;
  message?: string;
};

// The sentinel the model returns (via the system prompt) when it declines a
// request. A rare Unicode bracket pair so it can't collide with real copy.
export const REFUSAL_SENTINEL = "⟦REFUSED⟧";

// Appended to the generation system prompt. Tells the model to decline genuinely
// harmful requests with the sentinel — while explicitly protecting marketing
// metaphor so legitimate copy is never refused.
export const SAFETY_INSTRUCTION = `\n\nSAFETY POLICY: You only write legitimate marketing content. If the request asks you to create content that promotes, glorifies, plans, or gives instructions for real-world violence against people, terrorism, weapons or explosives, hatred against a protected group, sexual content involving minors, self-harm or suicide, or other clearly harmful or illegal activity — do NOT write it. In that case, respond with EXACTLY "${REFUSAL_SENTINEL} <a short reason>" and nothing else. Ordinary competitive marketing language (e.g. "crush the competition", "killer feature", "kill it at the gym", "explosive growth", "target audience") is legitimate and must NEVER be refused.`;

// Same policy, phrased for a structured (JSON) output path like the improver:
// the sentinel goes into the primary text field so parseRefusal() catches it.
export const SAFETY_INSTRUCTION_STRUCTURED = `\n\nSAFETY POLICY: You only edit legitimate marketing content. If the text to improve promotes, glorifies, plans, or gives instructions for real-world violence against people, terrorism, weapons or explosives, hatred against a protected group, sexual content involving minors, self-harm or suicide, or other clearly harmful or illegal activity — do NOT improve it. Instead set the primary rewritten-text field to EXACTLY "${REFUSAL_SENTINEL} <a short reason>". Ordinary competitive marketing language ("crush the competition", "killer feature", "explosive growth") is legitimate and must NEVER be refused.`;

const RULES: { category: string; message: string; re: RegExp }[] = [
  {
    category: "weapons",
    message: "making weapons or explosives",
    re: /\b(how to|instructions?\s+(for|to)|guide\s+to|steps?\s+to|build|make|construct|assemble|manufactur\w*|synthesiz\w*)\b[^.?!]{0,32}\b(a\s+bomb|pipe\s+bomb|car\s+bomb|dirty\s+bomb|ied|grenade|molotov|napalm|explosives\b|explosive\s+device|firearm|ghost\s+gun|3d[-\s]?printed\s+gun|silencer|suppressor|bioweapon|biological\s+weapon|chemical\s+weapon|nerve\s+agent)\b/i,
  },
  {
    category: "violence",
    message: "planning or promoting violence against people",
    re: /\b(how\s+to|best\s+way\s+to|plan(?:ning)?\s+to|help\s+me|i\s+want\s+to|ways?\s+to)\b[^.?!]{0,40}\b(kill|murder|assassinate|maim|behead|torture|poison|shoot|stab|strangle|lynch)\b[^.?!]{0,30}\b(someone|somebody|a\s+person|people|humans?|him|her|them|my\s+(wife|husband|ex|boss|neighbou?r|co-?worker|colleague|family|kids?|children|parents?|teacher|classmate|roommate)|these\s+people|those\s+people|children|kids)\b/i,
  },
  {
    category: "mass_violence",
    message: "mass violence or terrorism",
    re: /\b(school\s+shooting|mass\s+shooting|terror(?:ist)?\s+attack|suicide\s+bombing|ethnic\s+cleansing|genocide|massacre|lynching)\b/i,
  },
  {
    category: "glorify_violence",
    message: "glorifying or inciting violence",
    re: /\b(glorif\w*|celebrat\w*|prais\w*|promot\w*|incit\w*|justif\w*)\b[^.?!]{0,30}\b(violence|terrorism|genocide|mass\s+shooting|a\s+murder|rape|hate\s+crime)\b/i,
  },
  {
    category: "hate",
    message: "inciting hatred against a protected group",
    re: /\b(incit\w*|promot\w*|spread\w*|stir\s+up)\b[^.?!]{0,24}\bhatred?\b[^.?!]{0,20}\b(against|toward|of)\b/i,
  },
  {
    category: "sexual_exploitation",
    message: "sexual content involving minors",
    re: /\b(child|children|minor|underage|under-?age|preteen|pre-?teen|kid|toddler|infant)\b[^.?!]{0,25}\b(sexual|sexualiz\w*|porn\w*|nude|naked|explicit|erotic|fetish)\b|\b(sexual|porn\w*|nude|naked|explicit|erotic)\b[^.?!]{0,25}\b(child|children|minor|underage|preteen|kid|toddler)\b/i,
  },
  {
    category: "self_harm",
    message: "self-harm or suicide",
    re: /\b(how\s+to|best\s+way\s+to|methods?\s+(to|of)|encourage|promote)\b[^.?!]{0,30}\b(kill\s+myself|kill\s+yourself|commit\s+suicide|end\s+my\s+life|self[-\s]?harm|cut\s+myself)\b|\bpro-(ana|mia|suicide)\b/i,
  },
  {
    category: "illegal_drugs",
    message: "manufacturing illegal drugs",
    re: /\b(how\s+to|synthesiz\w*|manufactur\w*|cook|make|produce)\b[^.?!]{0,28}\b(meth|methamphetamine|crystal\s+meth|cocaine|crack\s+cocaine|heroin|fentanyl|mdma|lsd)\b/i,
  },
];

/**
 * Screen a request for clearly-harmful content. Returns `{ blocked: true, ... }`
 * with a user-facing message when the text expresses harmful intent, else
 * `{ blocked: false }`. Tuned to never trip on legitimate marketing language.
 */
export function screenContent(text: string): ModerationResult {
  const t = (text || "").slice(0, 4000);
  for (const r of RULES) {
    if (r.re.test(t)) {
      return {
        blocked: true,
        category: r.category,
        message: `This looks like a request for ${r.message}, which this tool won't create marketing content for. Please try a different topic.`,
      };
    }
  }
  return { blocked: false };
}

/**
 * Detect a model refusal from generated text. Returns the reason string if the
 * output is a refusal (the sentinel, or a short English "I can't help with…"),
 * else null.
 */
export function parseRefusal(text: string): string | null {
  const t = (text || "").trimStart();
  if (t.startsWith(REFUSAL_SENTINEL)) {
    const reason = t.slice(REFUSAL_SENTINEL.length).trim().split("\n")[0].slice(0, 200);
    return reason || "the request was declined for safety reasons";
  }
  // Fallback: a short output that reads like a safety refusal (belt & suspenders
  // in case the model declines in prose instead of using the sentinel).
  if (
    t.length < 260 &&
    /\bI\s+(can'?t|cannot|won'?t|am\s+not\s+able\s+to|will\s+not)\b[^.]{0,40}\b(help|assist|create|write|generate|produce)\b/i.test(t) &&
    /\b(violence|violent|harm|weapon|illegal|hateful|hate|dangerous|inappropriate|explicit|abuse|attack)\b/i.test(t)
  ) {
    return "the request was declined for safety reasons";
  }
  return null;
}
