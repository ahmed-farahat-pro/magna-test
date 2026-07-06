import { put } from "@vercel/blob";
import { randomUUID } from "crypto";

export const blobEnabled = (): boolean =>
  Boolean(process.env.BLOB_READ_WRITE_TOKEN);

/**
 * Persist a base64 PNG to Vercel Blob and return its permanent public URL.
 * DALL·E's own image URLs expire in ~1h, so we re-host the bytes here — this is
 * what keeps history images from breaking.
 */
export async function uploadPngFromBase64(b64: string): Promise<string> {
  const buffer = Buffer.from(b64, "base64");
  const { url } = await put(`images/${randomUUID()}.png`, buffer, {
    access: "public",
    contentType: "image/png",
  });
  return url;
}
