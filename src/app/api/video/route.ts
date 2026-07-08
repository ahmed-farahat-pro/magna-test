import { newRequestId } from "@/lib/http";
import { getSetting, LANDING_VIDEO_URL } from "@/lib/settings";
import { parseDriveId, driveEmbedUrl } from "@/lib/drive";
import { logError } from "@/lib/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Public: the landing-page illustration video, if an admin has set one. Returns
// { videoId, embedUrl } or nulls. No-store so a freshly-set video shows up.
export async function GET() {
  const requestId = newRequestId();
  try {
    const url = await getSetting(LANDING_VIDEO_URL);
    const id = url ? parseDriveId(url) : null;
    return Response.json(
      { videoId: id, embedUrl: id ? driveEmbedUrl(id) : null },
      { headers: { "x-request-id": requestId, "cache-control": "no-store" } },
    );
  } catch (e) {
    logError("video.get", requestId, e);
    return Response.json(
      { videoId: null, embedUrl: null },
      { headers: { "x-request-id": requestId, "cache-control": "no-store" } },
    );
  }
}
