// Parse and normalize YouTube links into an 11-character video id + embed URL.
// Accepts watch, youtu.be, embed, shorts, and bare-id forms.

const PATTERNS = [
  /(?:youtube\.com\/watch\?(?:.*&)?v=)([A-Za-z0-9_-]{11})/,
  /(?:youtu\.be\/)([A-Za-z0-9_-]{11})/,
  /(?:youtube\.com\/embed\/)([A-Za-z0-9_-]{11})/,
  /(?:youtube\.com\/shorts\/)([A-Za-z0-9_-]{11})/,
  /(?:youtube\.com\/live\/)([A-Za-z0-9_-]{11})/,
];

/** Extract a YouTube video id from a URL (or a bare id), else null. */
export function parseYouTubeId(input: string): string | null {
  const url = (input || "").trim();
  if (!url) return null;
  for (const re of PATTERNS) {
    const m = url.match(re);
    if (m) return m[1];
  }
  if (/^[A-Za-z0-9_-]{11}$/.test(url)) return url;
  return null;
}

/** Privacy-friendly embed URL for a given video id. */
export function youTubeEmbedUrl(id: string): string {
  return `https://www.youtube-nocookie.com/embed/${id}`;
}
