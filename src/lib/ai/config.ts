import Anthropic from "@anthropic-ai/sdk";

// Confirmed against the current Anthropic API. Swap the model in exactly one place.
export const MODEL = "claude-sonnet-5";

let client: Anthropic | null = null;

/** Server-only Anthropic client. Reads ANTHROPIC_API_KEY from the environment. */
export function anthropic(): Anthropic {
  if (!client) client = new Anthropic();
  return client;
}

export const aiEnabled = (): boolean => Boolean(process.env.ANTHROPIC_API_KEY);
