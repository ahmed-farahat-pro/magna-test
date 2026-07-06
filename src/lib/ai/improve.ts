import { anthropic, MODEL } from "./config";
import type { ImproveInput } from "@/lib/validation";

type Goal = ImproveInput["goal"];

const GOAL_INSTRUCTIONS: Record<Goal, string> = {
  shorter:
    "GOAL: Make it shorter. Cut ruthlessly — remove filler, redundancy, and hedging. Preserve every load-bearing idea and the call to action. Target roughly 40–60% of the original length while keeping it readable.",
  more_persuasive:
    "GOAL: Make it more persuasive. Sharpen the hook, lead with the benefit, add a concrete reason-to-believe, and strengthen the CTA using direct-response principles. Do not fabricate proof or statistics.",
  more_formal:
    "GOAL: Make it more formal. Raise the register to a professional business tone. Remove slang, contractions, and casual asides. Keep it clear and confident, not stiff or bureaucratic.",
  seo_optimized:
    "GOAL: Optimize for SEO. Infer the primary keyword from the text and weave it (and natural variants) into the opening, at least one subheading-worthy sentence, and the body — without keyword-stuffing. Improve scannability. Keep it reading naturally for humans.",
  rewrite_for_audience:
    "GOAL: Rewrite for a different audience. Adapt the vocabulary, examples, references, and level of technical depth for the NEW audience specified below. Keep the core message and offer identical; change only how it is framed and explained.",
};

const SYSTEM = `You are an expert editor. You improve marketing copy toward a specific goal without changing its core meaning, offer, or factual claims — unless the goal explicitly requires it.

You will receive a piece of text and a single improvement goal. Apply the goal faithfully. Then, in one or two sentences, explain what you changed and why, in plain language a marketer can understand.

Rules:
- Preserve the author's intent and any factual specifics (names, numbers, offers). Never invent new claims.
- Return ONLY the rewritten text plus the change summary, matching the schema exactly. No markdown fences, no preamble.
- The change summary describes the edits you made, not the content itself.`;

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    improved: { type: "string" },
    changeSummary: { type: "string" },
  },
  required: ["improved", "changeSummary"],
};

export type ImproveResult = {
  improved: string;
  changeSummary: string;
  usage: { inputTokens: number; outputTokens: number };
};

export async function improve(
  goal: Goal,
  text: string,
  targetAudience?: string,
): Promise<ImproveResult> {
  const audienceLine =
    goal === "rewrite_for_audience" && targetAudience
      ? `NEW TARGET AUDIENCE: ${targetAudience}\n`
      : "";

  const user = `Improve the following text.\n\n${GOAL_INSTRUCTIONS[goal]}\n${audienceLine}\nTEXT TO IMPROVE:\n"""\n${text}\n"""\n\nReturn the rewritten text and a one-to-two sentence summary of what changed.`;

  const res = await anthropic().messages.create({
    model: MODEL,
    max_tokens: 2000,
    system: SYSTEM,
    thinking: { type: "disabled" },
    output_config: { format: { type: "json_schema", schema: SCHEMA } },
    messages: [{ role: "user", content: user }],
  });

  if (res.stop_reason === "refusal") throw new Error("refusal");

  const block = res.content.find((b) => b.type === "text");
  const raw = block && block.type === "text" ? block.text : "";

  let d: { improved: string; changeSummary: string };
  try {
    d = JSON.parse(raw);
  } catch {
    throw new Error("parse_failed");
  }

  return {
    improved: d.improved,
    changeSummary: d.changeSummary,
    usage: {
      inputTokens: res.usage.input_tokens,
      outputTokens: res.usage.output_tokens,
    },
  };
}
