import { put, del } from "@vercel/blob";
import { randomUUID } from "crypto";

export const blobEnabled = (): boolean =>
  Boolean(process.env.BLOB_READ_WRITE_TOKEN);

/**
 * Persist a base64 PNG to Vercel Blob and return a URL the browser can load.
 * - Public store  -> the direct, permanent public blob URL.
 * - Private store -> a same-origin proxy URL (/api/img?p=...) that streams the
 *   private blob server-side (an <img> can't read a private blob directly).
 * Either way the URL is permanent and safe to store in history.
 */
export async function uploadPngFromBase64(b64: string): Promise<string> {
  const buffer = Buffer.from(b64, "base64");
  const pathname = `images/${randomUUID()}.png`;
  try {
    const { url } = await put(pathname, buffer, {
      access: "public",
      contentType: "image/png",
    });
    return url;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (!/private store|private access/i.test(msg)) throw e;
    // Store is private — upload privately and serve via the proxy route.
    const privatePath = `images/${randomUUID()}.png`;
    await put(privatePath, buffer, {
      access: "private",
      contentType: "image/png",
    });
    return `/api/img?p=${encodeURIComponent(privatePath)}`;
  }
}

/** Best-effort delete of a stored image (accepts a direct URL or our proxy URL). */
export async function deleteBlob(imageUrl: string): Promise<void> {
  let target = imageUrl;
  const m = imageUrl.match(/[?&]p=([^&]+)/);
  if (m) target = decodeURIComponent(m[1]);
  await del(target);
}
