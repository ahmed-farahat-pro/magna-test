// Turns token usage into a dollar cost. Prices are USD and match published rates
// at build time; kept in one place so the history view, the per-generation
// receipt, and the admin spend rollups all agree.

// Text models — USD per 1,000,000 tokens (input / output).
const TEXT_PRICE: Record<string, { in: number; out: number }> = {
  "claude-sonnet-5": { in: 3, out: 15 },
  "claude-opus-4-8": { in: 5, out: 25 },
  "claude-haiku-4-5": { in: 1, out: 5 },
};
const TEXT_FALLBACK = { in: 3, out: 15 };

// Image models — USD per generated image (approximate, standard size/quality).
const IMAGE_PRICE: Record<string, number> = {
  "gpt-image-1": 0.04,
  "dall-e-3": 0.04,
  "dall-e-2": 0.02,
};
const IMAGE_FALLBACK = 0.04;

/** Cost of a text generation, in USD. */
export function textCost(model: string, inputTokens: number, outputTokens: number): number {
  const p = TEXT_PRICE[model] ?? TEXT_FALLBACK;
  return (inputTokens * p.in + outputTokens * p.out) / 1_000_000;
}

/** Cost of one generated image, in USD. */
export function imageCost(model: string): number {
  return IMAGE_PRICE[model] ?? IMAGE_FALLBACK;
}

/** Format a USD amount with enough precision that tiny costs aren't just "$0.00". */
export function fmtUsd(n: number): string {
  if (n <= 0) return "$0.00";
  if (n < 0.01) return "$" + n.toFixed(5);
  if (n < 1) return "$" + n.toFixed(4);
  return "$" + n.toFixed(2);
}

/** Compact token count, e.g. 12,345 → "12.3k". */
export function fmtTokens(n: number): string {
  if (n < 1000) return String(n);
  return (n / 1000).toFixed(1).replace(/\.0$/, "") + "k";
}
