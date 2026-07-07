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
function stripMarkdown(s: string): string {
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

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  const lines = doc.splitTextToSize(stripMarkdown(text), maxWidth) as string[];
  const lineHeight = 16;
  for (const line of lines) {
    if (y > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
    doc.text(line, margin, y);
    y += lineHeight;
  }
  doc.save(filename.endsWith(".pdf") ? filename : `${filename}.pdf`);
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
