// Client-side export helpers. jsPDF is dynamically imported so it stays out of
// the initial bundle. DOC export uses a Word-compatible HTML blob (opens in Word
// / Google Docs) — no server round-trip.

function triggerBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export async function exportPdf(text: string, filename: string): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const margin = 48;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  const lines = doc.splitTextToSize(text, pageWidth - margin * 2) as string[];
  const lineHeight = 16;
  let y = margin;
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

export function exportDoc(text: string, filename: string): void {
  const html =
    "<html xmlns:o='urn:schemas-microsoft-com:office:office' " +
    "xmlns:w='urn:schemas-microsoft-com:office:word' " +
    "xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'></head>" +
    `<body><pre style="font-family:Calibri,Arial,sans-serif;font-size:11pt;white-space:pre-wrap;">${escapeHtml(text)}</pre></body></html>`;
  const blob = new Blob(["﻿", html], { type: "application/msword" });
  triggerBlob(blob, filename.endsWith(".doc") ? filename : `${filename}.doc`);
}
