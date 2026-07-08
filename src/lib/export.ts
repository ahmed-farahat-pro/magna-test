// Client-side export helpers. Heavy deps (jsPDF, docx) are dynamically imported
// so they stay out of the initial bundle. All three formats run fully in the
// browser — no server round-trip.

function triggerBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

// Flatten the Markdown-flavored assembled copy into clean plain text for exports,
// so headings/bold don't render as literal '#'/'**' in the PDF/Word file.
export function stripMarkdown(s: string): string {
  return s
    .replace(/^#{1,6}\s+/gm, "") // headings
    .replace(/\*\*([^*]+)\*\*/g, "$1") // bold
    .replace(/`([^`]+)`/g, "$1") // inline code
    .replace(/^\s*[-*]\s+/gm, "• ") // bullets
    .replace(/^-{3,}\s*$/gm, "") // horizontal rules
    .replace(/^_(.+)_$/gm, "$1") // whole-line italics (e.g. meta line)
    .replace(/\n{3,}/g, "\n\n") // collapse extra blank lines
    .trim();
}

type LoadedImage = {
  dataUrl: string;
  bytes: Uint8Array;
  width: number;
  height: number;
  pdfFormat: "PNG" | "JPEG";
  docxType: "png" | "jpg";
};

// Fetch an image and decode it into the shapes the exporters need: a base64 data
// URL (for jsPDF), raw bytes (for docx), and natural dimensions. Returns null on
// any failure — network, CORS, a stalled host (8s timeout), or a decode error —
// so callers fall back to a text-only export instead of hanging or breaking.
async function loadImage(url: string): Promise<LoadedImage | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const blob = await res.blob();
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result as string);
      fr.onerror = () => reject(new Error("read failed"));
      fr.readAsDataURL(blob);
    });
    const dims = await new Promise<{ width: number; height: number }>(
      (resolve, reject) => {
        const im = new Image();
        im.onload = () =>
          resolve({ width: im.naturalWidth, height: im.naturalHeight });
        im.onerror = () => reject(new Error("decode failed"));
        im.src = dataUrl;
      },
    );
    const isJpg = /jpe?g/i.test(blob.type);
    return {
      dataUrl,
      bytes,
      width: dims.width,
      height: dims.height,
      pdfFormat: isJpg ? "JPEG" : "PNG",
      docxType: isJpg ? "jpg" : "png",
    };
  } catch {
    return null;
  }
}

// Fit a natural size into a max width (never upscaling past the cap).
function fitWidth(natW: number, natH: number, maxW: number) {
  const w = natW > 0 ? Math.min(maxW, natW) : maxW;
  const h = natW > 0 ? (natH / natW) * w : maxW;
  return { w, h };
}

// ── Emoji-aware PDF text ─────────────────────────────────────────────────────
// jsPDF's built-in fonts (Helvetica et al.) can't encode emoji — they drop or
// mojibake them (you get boxes / raw codes). So we keep text as real, selectable
// jsPDF text and rasterize each emoji grapheme to a small inline COLOR image
// using the browser's own emoji font. Word/.docx handles emoji natively, so only
// the PDF path needs this.
const EMOJI_RE = /\p{Extended_Pictographic}/u;

// Grapheme-aware split so multi-codepoint emoji (ZWJ families, skin tones, flags)
// stay whole; falls back to codepoint split on engines without Intl.Segmenter.
function toGraphemes(s: string): string[] {
  const Seg = (
    Intl as unknown as {
      Segmenter?: new (
        l?: string,
        o?: { granularity: string },
      ) => { segment(x: string): Iterable<{ segment: string }> };
    }
  ).Segmenter;
  if (typeof Seg === "function") {
    const seg = new Seg(undefined, { granularity: "grapheme" });
    return Array.from(seg.segment(s), (x) => x.segment);
  }
  return Array.from(s);
}

// Rasterize one emoji glyph to a crisp color PNG via the browser's emoji font.
// Cached by glyph so repeats are free.
const emojiPngCache = new Map<string, string>();
function emojiPng(glyph: string): string {
  const hit = emojiPngCache.get(glyph);
  if (hit !== undefined) return hit;
  let url = "";
  try {
    const px = 128;
    const canvas = document.createElement("canvas");
    canvas.width = px;
    canvas.height = px;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = `${Math.round(px * 0.8)}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji","Twemoji Mozilla",sans-serif`;
      ctx.fillText(glyph, px / 2, px / 2);
      url = canvas.toDataURL("image/png");
    }
  } catch {
    url = "";
  }
  emojiPngCache.set(glyph, url);
  return url;
}

export async function exportPdf(
  text: string,
  filename: string,
  imageUrl?: string | null,
): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const margin = 48;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const maxWidth = pageWidth - margin * 2;
  let y = margin;

  // Embed the generated image at the top, scaled to fit the page.
  if (imageUrl) {
    const img = await loadImage(imageUrl);
    if (img) {
      let { w: drawW, h: drawH } = fitWidth(img.width, img.height, maxWidth);
      const maxH = pageHeight - margin * 2;
      if (drawH > maxH) {
        drawH = maxH;
        drawW = img.height > 0 ? (img.width / img.height) * drawH : maxWidth;
      }
      doc.addImage(img.dataUrl, img.pdfFormat, margin, y, drawW, drawH);
      y += drawH + 20;
      if (y > pageHeight - margin) {
        doc.addPage();
        y = margin;
      }
    }
  }

  // Body text — selectable jsPDF text, emoji drawn as inline color images.
  doc.setFont("helvetica", "normal");
  const fontSize = 11;
  doc.setFontSize(fontSize);
  const lineHeight = 16;
  const emW = fontSize; // square advance for one emoji glyph

  type Piece = { emoji: boolean; s: string; w: number };
  const drawPieces = (pieces: Piece[]) => {
    if (y > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
    let x = margin;
    for (const p of pieces) {
      if (p.emoji) {
        const url = emojiPng(p.s);
        if (url) doc.addImage(url, "PNG", x, y - fontSize + 2.5, emW, emW);
      } else {
        doc.text(p.s, x, y);
      }
      x += p.w;
    }
    y += lineHeight;
  };

  for (const para of stripMarkdown(text).split("\n")) {
    if (para === "") {
      if (y > pageHeight - margin) {
        doc.addPage();
        y = margin;
      }
      y += lineHeight;
      continue;
    }
    // Width-annotated graphemes (emoji count as a square advance), then a greedy
    // wrap that breaks at the last space that fit.
    const gs = toGraphemes(para).map((g) => {
      const emoji = EMOJI_RE.test(g);
      return {
        emoji,
        s: g,
        w: emoji ? emW : doc.getTextWidth(g),
        space: !emoji && /\s/.test(g),
      };
    });
    let line: typeof gs = [];
    let lineW = 0;
    let lastSpace = -1;
    const flush = (arr: typeof gs) => {
      const pieces: Piece[] = [];
      for (const g of arr) {
        const last = pieces[pieces.length - 1];
        if (!g.emoji && last && !last.emoji) {
          last.s += g.s;
          last.w += g.w;
        } else {
          pieces.push({ emoji: g.emoji, s: g.s, w: g.w });
        }
      }
      drawPieces(pieces);
    };
    for (const g of gs) {
      if (lineW + g.w > maxWidth && line.length > 0) {
        if (lastSpace > 0) {
          flush(line.slice(0, lastSpace));
          line = line.slice(lastSpace + 1);
          lineW = line.reduce((a, p) => a + p.w, 0);
          lastSpace = -1;
        } else {
          flush(line);
          line = [];
          lineW = 0;
          lastSpace = -1;
        }
      }
      line.push(g);
      lineW += g.w;
      if (g.space) lastSpace = line.length - 1;
    }
    if (line.length > 0) flush(line);
  }
  doc.save(filename.endsWith(".pdf") ? filename : `${filename}.pdf`);
}

/** Plain-text download (faithful copy — no markdown stripping). */
export function exportTxt(text: string, filename: string): void {
  triggerBlob(
    new Blob([text], { type: "text/plain;charset=utf-8" }),
    filename.endsWith(".txt") ? filename : `${filename}.txt`,
  );
}

// Real OOXML .docx (not HTML-in-.doc): the image is stored as a proper media
// part, so it renders in Microsoft Word desktop, Google Docs, and Pages alike.
export async function exportDocx(
  text: string,
  filename: string,
  imageUrl?: string | null,
): Promise<void> {
  const { Document, Packer, Paragraph, TextRun, ImageRun } = await import("docx");

  const children: InstanceType<typeof Paragraph>[] = [];

  if (imageUrl) {
    const img = await loadImage(imageUrl);
    if (img) {
      const { w, h } = fitWidth(img.width, img.height, 480);
      children.push(
        new Paragraph({
          spacing: { after: 200 },
          children: [
            new ImageRun({
              type: img.docxType,
              data: img.bytes,
              transformation: { width: Math.round(w), height: Math.round(h) },
            }),
          ],
        }),
      );
    }
  }

  for (const line of stripMarkdown(text).split("\n")) {
    children.push(
      new Paragraph({
        spacing: { after: 120 },
        children: line ? [new TextRun({ text: line })] : [],
      }),
    );
  }

  const doc = new Document({ sections: [{ properties: {}, children }] });
  const blob = await Packer.toBlob(doc);
  triggerBlob(blob, filename.endsWith(".docx") ? filename : `${filename}.docx`);
}
