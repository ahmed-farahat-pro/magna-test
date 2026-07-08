import { dbEnabled, getPrisma } from "@/lib/db";

// A tiny key/value settings store, backed by the `settings` table. All calls are
// best-effort and no-op when the DB isn't configured, so callers never need to
// guard for the database being absent.

export async function getSetting(key: string): Promise<string | null> {
  if (!dbEnabled()) return null;
  try {
    const row = await getPrisma().setting.findUnique({
      where: { key },
      select: { value: true },
    });
    return row?.value ?? null;
  } catch {
    return null;
  }
}

export async function setSetting(key: string, value: string): Promise<void> {
  if (!dbEnabled()) return;
  await getPrisma().setting.upsert({
    where: { key },
    create: { key, value },
    update: { value },
  });
}

export async function deleteSetting(key: string): Promise<void> {
  if (!dbEnabled()) return;
  try {
    await getPrisma().setting.delete({ where: { key } });
  } catch {
    /* already absent — fine */
  }
}

// Setting keys used by the app.
export const LANDING_VIDEO_URL = "landing_video_url";
