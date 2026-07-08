import { dbEnabled, getPrisma } from "@/lib/db";

// The vocabulary of things worth counting on the admin dashboard.
export type ActivityType =
  | "session_start"
  | "text_generate"
  | "image_generate"
  | "improve"
  | "enforce_voice"
  | "brand_voice_create"
  | "signup"
  | "login";

/**
 * Append one row to the activity log. Best-effort by design: analytics must NEVER
 * break or slow a user-facing action, so this swallows every error and no-ops when
 * the database isn't configured. Callers may `await` it (the insert is a single
 * indexed write) or fire-and-forget.
 */
export async function track(
  type: ActivityType,
  sessionId: string,
  isUser: boolean,
  meta?: Record<string, unknown>,
): Promise<void> {
  if (!dbEnabled()) return;
  try {
    await getPrisma().activityEvent.create({
      data: { type, sessionId, isUser, meta: meta ? (meta as object) : undefined },
    });
  } catch {
    /* tracking is non-fatal — drop it silently */
  }
}
