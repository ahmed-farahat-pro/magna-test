import { anthropic, MODEL } from "./config";

/**
 * Hard brand-voice enforcement: rewrite the copy to COMPLETELY remove the given
 * words/phrases (and close variants), preserving meaning, tone, structure, and
 * formatting. Returns the rewritten copy (or the original on failure).
 */
export async function enforceVoice(
  text: string,
  avoid: string[],
): Promise<string> {
  const res = await anthropic().messages.create(
    {
      model: MODEL,
      max_tokens: 2000,
      thinking: { type: "disabled" },
      system:
        "You are a meticulous copy editor. Rewrite the given marketing copy to COMPLETELY remove the listed banned words/phrases AND any close variants or obvious synonyms of them. Preserve the meaning, tone, structure, markdown formatting, and length as closely as possible — change as little else as you can. Do not add commentary. Return ONLY the rewritten copy.",
      messages: [
        {
          role: "user",
          content:
            `BANNED — remove these words/phrases entirely: ${avoid.join(", ")}\n\n` +
            `COPY TO FIX:\n"""\n${text.slice(0, 9000)}\n"""`,
        },
      ],
    },
    { timeout: 30000, maxRetries: 1 },
  );
  if (res.stop_reason === "refusal") return text;
  const block = res.content.find((b) => b.type === "text");
  let out = block && block.type === "text" ? block.text.trim() : "";
  // Strip any wrapping code fence or triple-quote the model may add.
  out = out
    .replace(/^```[a-z]*\n?/i, "")
    .replace(/\n?```$/i, "")
    .replace(/^"""\s*/, "")
    .replace(/\s*"""$/, "")
    .trim();
  return out.length > 0 ? out : text;
}
