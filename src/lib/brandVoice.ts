// Brand voice is stored client-side (per browser/session) and passed explicitly
// on generation requests, so it works without server auth and is injected into
// the prompt only when the user opts in.
export type BrandVoice = {
  name: string;
  personality?: string[];
  formality?: string;
  industry?: string;
  description?: string;
  keywords?: string[];
  avoid?: string[];
};

const KEY = "acms_brand_voice";

export function loadBrandVoice(): BrandVoice | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as BrandVoice) : null;
  } catch {
    return null;
  }
}

export function saveBrandVoice(v: BrandVoice): void {
  window.localStorage.setItem(KEY, JSON.stringify(v));
}

export function clearBrandVoice(): void {
  window.localStorage.removeItem(KEY);
}
