import { isAdmin } from "@/lib/admin";
import { ok, fail, newRequestId, tooLarge } from "@/lib/http";
import { getSetting, setSetting, deleteSetting, LANDING_VIDEO_URL } from "@/lib/settings";
import { parseDriveId, driveEmbedUrl } from "@/lib/drive";
import { logError } from "@/lib/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function payload(url: string | null) {
  const id = url ? parseDriveId(url) : null;
  return { url: url ?? null, videoId: id, embedUrl: id ? driveEmbedUrl(id) : null };
}

// GET — the currently-configured landing video (admin only).
export async function GET() {
  const requestId = newRequestId();
  try {
    if (!(await isAdmin())) return fail("UNAUTHORIZED", "Admin sign-in required.", requestId);
    return ok(payload(await getSetting(LANDING_VIDEO_URL)), requestId);
  } catch (e) {
    logError("admin.video.get", requestId, e);
    return fail("INTERNAL_ERROR", "Could not load the video setting.", requestId);
  }
}

// POST — set (or clear) the landing video. Body: { url }. Empty url clears it.
export async function POST(req: Request) {
  const requestId = newRequestId();
  try {
    if (!(await isAdmin())) return fail("UNAUTHORIZED", "Admin sign-in required.", requestId);
    if (tooLarge(req)) return fail("PAYLOAD_TOO_LARGE", "Request body is too large.", requestId);

    const body = (await req.json().catch(() => null)) as { url?: unknown } | null;
    const raw = typeof body?.url === "string" ? body.url.trim() : "";

    if (!raw) {
      await deleteSetting(LANDING_VIDEO_URL);
      return ok(payload(null), requestId);
    }
    const id = parseDriveId(raw);
    if (!id) {
      return fail("VALIDATION_ERROR", "That doesn't look like a Google Drive link. Paste a drive.google.com share link (the file must be shared “Anyone with the link”).", requestId, {
        details: [{ path: "url", message: "invalid_drive_url" }],
      });
    }
    await setSetting(LANDING_VIDEO_URL, raw);
    return ok(payload(raw), requestId);
  } catch (e) {
    logError("admin.video.post", requestId, e);
    return fail("INTERNAL_ERROR", "Could not save the video.", requestId);
  }
}
