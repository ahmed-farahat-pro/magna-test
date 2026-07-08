// Parse and normalize Google Drive share links into a file id + an inline
// preview embed URL (what goes in an <iframe src>).
//
// Accepts the common Drive forms the admin might paste:
//   https://drive.google.com/file/d/<ID>/view?usp=sharing
//   https://drive.google.com/file/d/<ID>/preview
//   https://drive.google.com/open?id=<ID>
//   https://drive.google.com/uc?id=<ID>&export=download
//   https://docs.google.com/…/d/<ID>/…
//
// NOTE: the file must be shared "Anyone with the link" for viewers to see it —
// that's a Drive sharing setting, not something the app can set.

// Drive file ids are long, URL-safe strings — match greedily up to the next
// path/query delimiter (which aren't in the character class).
const ID = "[A-Za-z0-9_-]{10,}";

const PATTERNS = [
  new RegExp(`drive\\.google\\.com/file/d/(${ID})`),
  new RegExp(`drive\\.google\\.com/(?:open|uc)\\?(?:[^#]*&)?id=(${ID})`),
  new RegExp(`docs\\.google\\.com/[^/]+/d/(${ID})`),
];

/** Extract a Google Drive file id from a share URL, else null. */
export function parseDriveId(input: string): string | null {
  const url = (input || "").trim();
  if (!url) return null;
  for (const re of PATTERNS) {
    const m = url.match(re);
    if (m) return m[1];
  }
  return null;
}

/** Inline-playable preview embed URL for a Drive file id (use as an iframe src). */
export function driveEmbedUrl(id: string): string {
  return `https://drive.google.com/file/d/${id}/preview`;
}
