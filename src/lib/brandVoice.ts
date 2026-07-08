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

/** Fetch the session's server-stored brand voice (the source of truth). */
export async function pullBrandVoice(): Promise<BrandVoice | null> {
  try {
    const res = await fetch("/api/brand-voice");
    if (!res.ok) return null;
    const json = await res.json();
    return (json?.brandVoice as BrandVoice) ?? null;
  } catch {
    return null;
  }
}

/** Persist the brand voice to the server (best-effort; localStorage stays the cache). */
export async function pushBrandVoice(v: BrandVoice): Promise<void> {
  try {
    await fetch("/api/brand-voice", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(v),
    });
  } catch {
    /* offline — localStorage still holds it */
  }
}
