// Brand voices are stored server-side (source of truth), one session can have
// many. The browser only remembers which one is currently SELECTED on the
// generator, in localStorage.

export type BrandVoice = {
  id?: string;
  name: string;
  personality?: string[];
  formality?: string;
  industry?: string;
  description?: string;
  keywords?: string[];
  avoid?: string[];
};

const SELECTED_KEY = "acms_brand_voice_selected";

export function getSelectedVoiceId(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(SELECTED_KEY);
}

export function setSelectedVoiceId(id: string | null): void {
  if (typeof window === "undefined") return;
  if (id) window.localStorage.setItem(SELECTED_KEY, id);
  else window.localStorage.removeItem(SELECTED_KEY);
}

export async function listVoices(): Promise<BrandVoice[]> {
  try {
    const res = await fetch("/api/brand-voice");
    if (!res.ok) return [];
    const json = await res.json();
    return (json?.voices as BrandVoice[]) ?? [];
  } catch {
    return [];
  }
}

export async function createVoice(v: BrandVoice): Promise<BrandVoice | null> {
  try {
    const res = await fetch("/api/brand-voice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(v),
    });
    if (!res.ok) return null;
    return (await res.json()).voice ?? null;
  } catch {
    return null;
  }
}

export async function updateVoice(
  id: string,
  v: BrandVoice,
): Promise<BrandVoice | null> {
  try {
    const res = await fetch(`/api/brand-voice/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(v),
    });
    if (!res.ok) return null;
    return (await res.json()).voice ?? null;
  } catch {
    return null;
  }
}

export async function deleteVoice(id: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/brand-voice/${id}`, { method: "DELETE" });
    return res.ok;
  } catch {
    return false;
  }
}
