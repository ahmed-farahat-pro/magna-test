import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";

// Confirmed against the current Anthropic API. Swap the model in exactly one place.
export const MODEL = "claude-sonnet-5";

let anthropicClient: Anthropic | null = null;

/** Server-only Anthropic client. Reads ANTHROPIC_API_KEY from the environment. */
export function anthropic(): Anthropic {
  if (!anthropicClient) anthropicClient = new Anthropic();
  return anthropicClient;
}

export const aiEnabled = (): boolean => Boolean(process.env.ANTHROPIC_API_KEY);

let openaiClient: OpenAI | null = null;

/** Server-only OpenAI client (DALL·E 3). Reads OPENAI_API_KEY from the environment. */
export function openai(): OpenAI {
  if (!openaiClient) openaiClient = new OpenAI();
  return openaiClient;
}

export const imageEnabled = (): boolean => Boolean(process.env.OPENAI_API_KEY);
