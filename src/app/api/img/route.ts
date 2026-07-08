import { get } from "@vercel/blob";

// Streams a private Blob image to the browser (private blobs can't be loaded
// directly in an <img>). The pathname carries an unguessable UUID, so the proxy
// URL is the access capability — same security model as an unguessable public
// blob URL.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Only ever proxy our own generated image paths — never an arbitrary blob path.
const IMAGE_PATH = /^images\/[a-f0-9-]{16,}\.png$/i;

export async function GET(req: Request) {
  const p = new URL(req.url).searchParams.get("p");
  if (!p || !IMAGE_PATH.test(p)) return new Response("Not found", { status: 404 });

  try {
    const res = await get(p, { access: "private" });
    if (!res || res.statusCode !== 200) {
      return new Response("Not found", { status: 404 });
    }
    return new Response(res.stream, {
      headers: {
        "content-type": res.blob.contentType || "image/png",
        "cache-control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
